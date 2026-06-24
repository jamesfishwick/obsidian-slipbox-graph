# Slipbox Semantic Graph

A force-directed graph view for [Obsidian](https://obsidian.md) that renders your notes with **human-readable titles** and **color-coded semantic link types** instead of opaque IDs and undifferentiated edges.

Where Obsidian's built-in graph shows every connection as the same grey line, this view distinguishes *how* notes relate: an `extends` edge looks different from a `contradicts` edge, which looks different from a loose `related` edge. The result is a map you can actually read at a glance.

## Designed for the Slipbox MCP server

This plugin is the visual companion to the [**Slipbox MCP server**](https://github.com/jamesfishwick/slipbox-mcp) — an [MCP server](https://modelcontextprotocol.io/) that turns any MCP-compatible AI assistant (Claude Desktop, Claude Code, and others) into a Zettelkasten partner: creating atomic notes, forming semantic links, and detecting emergent clusters.

Slipbox writes plain markdown notes with YAML frontmatter and a typed `## Links` section. This plugin reads exactly that format and visualizes it. The two are designed to work together:

| Slipbox MCP server | This plugin |
| --- | --- |
| Creates and links notes via your AI agent | Renders those notes and links as a graph |
| Stores the seven typed link relationships | Color-codes each type by semantic family |
| Source of truth: plain markdown files | Reads the same files, no extra index needed |

You do **not** need the MCP server to use this plugin — any vault whose notes follow the [expected format](#note-format) will render. But if you are running Slipbox, this view requires zero additional configuration.

> Slipbox MCP server: <https://github.com/jamesfishwick/slipbox-mcp>

## Features

- **Force-directed layout** powered by [d3-force](https://github.com/d3/d3-force).
- **Human-readable node labels** — titles are pulled from frontmatter `title`, falling back to the first H1, then the filename.
- **Twelve semantic link types** color-coded into four families (see below).
- **Directional styling** — inverse links (`extended_by`, `refined_by`, …) render dashed so you can tell direction at a glance.
- **Filter by link type or family**, search nodes, and click a node to open the underlying note.
- **No telemetry, no network calls** — everything is computed locally from your vault.

## Semantic link types

Link types mirror the Slipbox MCP server's `LinkType` enum. Each is grouped into a color family:

| Family | Link types | Meaning | Color |
| --- | --- | --- | --- |
| Epistemic | `extends` / `extended_by`, `refines` / `refined_by` | Building and sharpening knowledge | Blue / cyan |
| Dialectic | `supports` / `supported_by`, `contradicts` / `contradicted_by`, `questions` / `questioned_by` | Discourse between ideas | Green / red / amber |
| Structural | `reference` | A plain cross-reference | Grey |
| Loose | `related` | Soft association | Purple |

Solid lines are the forward relationship; dashed lines are the inverse (`_by`) form.

## Note format

A note is included in the graph if its frontmatter has an `id` field. Semantic links live in a `## Links` section, one per bullet, in the form `- <type> [[<id>]] <optional description>`:

```markdown
---
id: 20250731T173754955781000
title: Free Verse Rhythm as Structural Meaning
type: permanent
tags:
  - poetry
  - rhythm
---

# Free Verse Rhythm as Structural Meaning

...note body...

## Links
- related [[20250728T124307555020000]] Both address how formal choices support meaning
- reference [[20251217T172432480464000]] Member of the Poetry Revision Principles structure
```

Only edges whose source and target IDs both exist in the vault are drawn.

## Installation

### From the Community Plugins directory

Once accepted, in Obsidian: **Settings → Community plugins → Browse**, search for "Slipbox Semantic Graph", then **Install** and **Enable**.

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/jamesfishwick/obsidian-slipbox-graph/releases).
1. Copy them into `<your-vault>/.obsidian/plugins/slipbox-graph/`.
1. Reload Obsidian and enable the plugin under **Settings → Community plugins**.

## Usage

- Click the **git-fork** ribbon icon, or
- Run the **Open semantic graph** command from the command palette.

The graph opens in the right sidebar. Use the controls bar to filter by link type or family, search for a node, or click a node to open its note.

## Development

```bash
npm install
npm run dev     # watch build
npm run build   # type-check + production build
```

The build emits `main.js` at the repository root.

## License

[MIT](LICENSE) © James Fishwick
