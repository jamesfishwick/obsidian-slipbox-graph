/** Semantic link types matching slipbox-mcp's LinkType enum. */
export type LinkType =
  | "reference"
  | "extends"
  | "extended_by"
  | "refines"
  | "refined_by"
  | "contradicts"
  | "contradicted_by"
  | "questions"
  | "questioned_by"
  | "supports"
  | "supported_by"
  | "related";

/** Visual category for grouping link types into color families. */
export type LinkFamily = "epistemic" | "dialectic" | "structural" | "loose";

export interface LinkStyle {
  color: string;
  dash: string;       // SVG stroke-dasharray ("" = solid)
  label: string;      // Human-readable label for legend
  family: LinkFamily;
}

/**
 * Color palette designed for dark backgrounds (matching Obsidian's default).
 * Each semantic family gets a distinct hue:
 *   - Epistemic (extends/refines): blue-cyan -- building knowledge
 *   - Dialectic (contradicts/questions/supports): warm tones -- discourse
 *   - Structural (reference): neutral grey
 *   - Loose (related): muted purple
 */
export const LINK_STYLES: Record<LinkType, LinkStyle> = {
  extends:          { color: "#4fc3f7", dash: "",       label: "extends",        family: "epistemic" },
  extended_by:      { color: "#4fc3f7", dash: "6 3",    label: "extended by",    family: "epistemic" },
  refines:          { color: "#00bcd4", dash: "",       label: "refines",        family: "epistemic" },
  refined_by:       { color: "#00bcd4", dash: "6 3",    label: "refined by",     family: "epistemic" },
  supports:         { color: "#81c784", dash: "",       label: "supports",       family: "dialectic" },
  supported_by:     { color: "#81c784", dash: "6 3",    label: "supported by",   family: "dialectic" },
  contradicts:      { color: "#ef5350", dash: "",       label: "contradicts",    family: "dialectic" },
  contradicted_by:  { color: "#ef5350", dash: "6 3",    label: "contradicted by",family: "dialectic" },
  questions:        { color: "#ffb74d", dash: "",       label: "questions",      family: "dialectic" },
  questioned_by:    { color: "#ffb74d", dash: "6 3",    label: "questioned by",  family: "dialectic" },
  reference:        { color: "#90a4ae", dash: "",       label: "reference",      family: "structural" },
  related:          { color: "#b39ddb", dash: "4 4",    label: "related",        family: "loose" },
};

export interface GraphNode {
  id: string;
  title: string;
  tags: string[];
  noteType: string;   // "permanent", "fleeting", "structure", etc.
  filePath: string;    // vault-relative path for navigation
  linkCount: number;   // total in + out degree
}

export interface GraphLink {
  source: string;
  target: string;
  linkType: LinkType;
  description: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
