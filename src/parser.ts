import { TFile, Vault, MetadataCache } from "obsidian";
import { GraphData, GraphNode, GraphLink, LinkType, LINK_STYLES } from "./types";

const LINK_LINE_RE = /^-\s+([\w]+)\s+\[\[([^\]]+)\]\]\s*(.*)?$/;

const VALID_LINK_TYPES = new Set(Object.keys(LINK_STYLES));

/**
 * Parse the `## Links` section from a note's raw content.
 * Returns typed edges with source set to the given noteId.
 */
function parseLinks(noteId: string, content: string): GraphLink[] {
  const links: GraphLink[] = [];
  const linksIdx = content.indexOf("## Links");
  if (linksIdx === -1) return links;

  const section = content.slice(linksIdx);
  const lines = section.split("\n").slice(1); // skip the heading itself

  for (const line of lines) {
    // Stop at the next heading
    if (line.startsWith("## ") || line.startsWith("# ")) break;

    const m = line.match(LINK_LINE_RE);
    if (!m) continue;

    const rawType = m[1].toLowerCase();
    if (!VALID_LINK_TYPES.has(rawType)) continue;

    links.push({
      source: noteId,
      target: m[2].trim(),
      linkType: rawType as LinkType,
      description: (m[3] || "").trim(),
    });
  }
  return links;
}

/**
 * Extract title from YAML frontmatter, falling back to first H1 or filename.
 */
function extractTitle(
  file: TFile,
  metadata: MetadataCache
): string {
  const cache = metadata.getFileCache(file);
  // Try frontmatter title first
  if (cache?.frontmatter?.title) {
    return cache.frontmatter.title;
  }
  // Fall back to first heading
  if (cache?.headings?.[0]) {
    return cache.headings[0].heading;
  }
  // Last resort: filename without extension
  return file.basename;
}

function extractId(file: TFile, metadata: MetadataCache): string | null {
  const cache = metadata.getFileCache(file);
  return cache?.frontmatter?.id ?? null;
}

function extractTags(file: TFile, metadata: MetadataCache): string[] {
  const cache = metadata.getFileCache(file);
  const tags: string[] = cache?.frontmatter?.tags ?? [];
  return Array.isArray(tags) ? tags : [];
}

function extractNoteType(file: TFile, metadata: MetadataCache): string {
  const cache = metadata.getFileCache(file);
  return cache?.frontmatter?.type ?? "unknown";
}

/**
 * Build the full graph by scanning all markdown files in the vault.
 * Only includes notes that have a frontmatter `id` field (slipbox notes).
 */
export async function buildGraphData(
  vault: Vault,
  metadata: MetadataCache
): Promise<GraphData> {
  const files = vault.getMarkdownFiles();
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const idToPath = new Map<string, string>();

  for (const file of files) {
    const noteId = extractId(file, metadata);
    if (!noteId) continue; // skip non-slipbox files

    idToPath.set(noteId, file.path);

    const content = await vault.cachedRead(file);
    const noteLinks = parseLinks(noteId, content);
    links.push(...noteLinks);

    nodes.push({
      id: noteId,
      title: extractTitle(file, metadata),
      tags: extractTags(file, metadata),
      noteType: extractNoteType(file, metadata),
      filePath: file.path,
      linkCount: 0, // computed below
    });
  }

  // Filter links to only include edges where both endpoints exist in the vault
  const nodeIds = new Set(nodes.map((n) => n.id));
  const validLinks = links.filter(
    (l) => nodeIds.has(l.source) && nodeIds.has(l.target)
  );

  // Compute degree counts
  const degreeMap = new Map<string, number>();
  for (const l of validLinks) {
    degreeMap.set(l.source, (degreeMap.get(l.source) ?? 0) + 1);
    degreeMap.set(l.target, (degreeMap.get(l.target) ?? 0) + 1);
  }
  for (const n of nodes) {
    n.linkCount = degreeMap.get(n.id) ?? 0;
  }

  return { nodes, links: validLinks };
}
