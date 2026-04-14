import { ItemView, WorkspaceLeaf, Menu } from "obsidian";
import * as d3 from "d3";
import { GraphData, GraphNode, GraphLink, LinkType, LINK_STYLES, LinkFamily } from "./types";
import { buildGraphData } from "./parser";

export const VIEW_TYPE = "slipbox-semantic-graph";

interface SimNode extends d3.SimulationNodeDatum, GraphNode {}
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  linkType: LinkType;
  description: string;
}

/** Extract node ID from a D3 link endpoint (pre- or post-simulation init). */
function linkNodeId(endpoint: string | number | SimNode): string {
  return typeof endpoint === "object" ? (endpoint as SimNode).id : String(endpoint);
}

export class SlipboxGraphView extends ItemView {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private simulation: d3.Simulation<SimNode, SimLink> | null = null;
  private graphData: GraphData | null = null;

  // Filter state
  private hiddenLinkTypes = new Set<LinkType>();
  private hiddenFamilies = new Set<LinkFamily>();
  private searchQuery = "";
  private highlightedNodeId: string | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Slipbox Graph";
  }

  getIcon(): string {
    return "git-fork";
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass("slipbox-graph-container");

    // Controls bar
    const controls = container.createDiv({ cls: "slipbox-graph-controls" });
    this.buildControls(controls);

    // SVG container
    const graphEl = container.createDiv({ cls: "slipbox-graph-canvas" });

    this.graphData = await buildGraphData(
      this.app.vault,
      this.app.metadataCache
    );

    this.renderGraph(graphEl);
  }

  async onClose(): Promise<void> {
    this.simulation?.stop();
  }

  private buildControls(container: HTMLElement): void {
    // Search input
    const searchInput = container.createEl("input", {
      attr: { type: "text", placeholder: "Filter notes..." },
      cls: "slipbox-graph-search",
    });
    searchInput.addEventListener("input", () => {
      this.searchQuery = searchInput.value.toLowerCase();
      this.updateVisibility();
    });

    // Legend / filter toggles
    const legend = container.createDiv({ cls: "slipbox-graph-legend" });

    const families: { family: LinkFamily; label: string }[] = [
      { family: "epistemic", label: "Epistemic" },
      { family: "dialectic", label: "Dialectic" },
      { family: "structural", label: "Structural" },
      { family: "loose", label: "Loose" },
    ];

    for (const { family, label } of families) {
      const familyTypes = Object.entries(LINK_STYLES)
        .filter(([, s]) => s.family === family)
        .map(([t]) => t as LinkType);

      const representativeColor = LINK_STYLES[familyTypes[0]].color;

      const chip = legend.createEl("button", {
        cls: "slipbox-graph-chip",
        text: label,
      });
      chip.style.borderColor = representativeColor;
      chip.style.color = representativeColor;

      chip.addEventListener("click", () => {
        if (this.hiddenFamilies.has(family)) {
          this.hiddenFamilies.delete(family);
          familyTypes.forEach((t) => this.hiddenLinkTypes.delete(t));
          chip.removeClass("slipbox-graph-chip--hidden");
        } else {
          this.hiddenFamilies.add(family);
          familyTypes.forEach((t) => this.hiddenLinkTypes.add(t));
          chip.addClass("slipbox-graph-chip--hidden");
        }
        this.updateVisibility();
      });

      // Tooltip with specific types
      chip.setAttribute(
        "title",
        familyTypes.map((t) => LINK_STYLES[t].label).join(", ")
      );
    }

    // Refresh button
    const refresh = container.createEl("button", {
      cls: "slipbox-graph-btn",
      text: "Refresh",
    });
    refresh.addEventListener("click", async () => {
      this.graphData = await buildGraphData(
        this.app.vault,
        this.app.metadataCache
      );
      const graphEl = this.containerEl.querySelector(
        ".slipbox-graph-canvas"
      ) as HTMLElement;
      if (graphEl) {
        graphEl.empty();
        this.renderGraph(graphEl);
      }
    });
  }

  private renderGraph(container: HTMLElement): void {
    if (!this.graphData) return;

    const { width, height } = container.getBoundingClientRect();
    const w = width || 800;
    const h = height || 600;

    // Build simulation-compatible data (deep copy so D3 can mutate)
    const nodes: SimNode[] = this.graphData.nodes.map((n) => ({ ...n }));
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const links: SimLink[] = this.graphData.links
      .filter((l) => nodeMap.has(l.source) && nodeMap.has(l.target))
      .map((l) => ({
        source: l.source,
        target: l.target,
        linkType: l.linkType,
        description: l.description,
      }));

    // SVG setup
    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${w} ${h}`);

    this.svg = svg;

    // Zoom behavior
    const g = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 6])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    // Arrow markers per link type
    const defs = svg.append("defs");
    for (const [type, style] of Object.entries(LINK_STYLES)) {
      defs
        .append("marker")
        .attr("id", `arrow-${type}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", style.color);
    }

    // Links
    const linkGroup = g.append("g").attr("class", "links");
    const link = linkGroup
      .selectAll<SVGLineElement, SimLink>("line")
      .data(links)
      .join("line")
      .attr("class", (d) => `graph-link link-type-${d.linkType} link-family-${LINK_STYLES[d.linkType].family}`)
      .attr("stroke", (d) => LINK_STYLES[d.linkType].color)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", (d) => LINK_STYLES[d.linkType].dash)
      .attr("marker-end", (d) => `url(#arrow-${d.linkType})`)
      .attr("stroke-opacity", 0.6);

    // Link hover tooltips
    link.append("title").text(
      (d) => {
        const style = LINK_STYLES[d.linkType];
        return d.description
          ? `${style.label}: ${d.description}`
          : style.label;
      }
    );

    // Nodes
    const nodeGroup = g.append("g").attr("class", "nodes");
    const node = nodeGroup
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .join("g")
      .attr("class", "graph-node")
      .call(this.dragBehavior() as any);

    // Node circles -- size by degree
    const radiusScale = d3
      .scaleSqrt()
      .domain([0, d3.max(nodes, (n) => n.linkCount) ?? 1])
      .range([4, 16]);

    node
      .append("circle")
      .attr("r", (d) => radiusScale(d.linkCount))
      .attr("fill", (d) => this.nodeColor(d))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1);

    // Node labels -- HUMAN-READABLE TITLES
    node
      .append("text")
      .text((d) => this.truncateTitle(d.title, 30))
      .attr("dx", (d) => radiusScale(d.linkCount) + 4)
      .attr("dy", "0.35em")
      .attr("class", "graph-node-label")
      .attr("fill", "#e0e0e0")
      .attr("font-size", "11px");

    // Click to open note
    node.on("click", (_event, d) => {
      const file = this.app.vault.getAbstractFileByPath(d.filePath);
      if (file) {
        this.app.workspace.openLinkText(d.filePath, "", false);
      }
    });

    // Right-click context menu
    node.on("contextmenu", (event: MouseEvent, d) => {
      event.preventDefault();
      const menu = new Menu();
      menu.addItem((item) =>
        item.setTitle(`Open "${d.title}"`).onClick(() => {
          this.app.workspace.openLinkText(d.filePath, "", false);
        })
      );
      menu.addItem((item) =>
        item.setTitle("Focus neighborhood").onClick(() => {
          this.highlightedNodeId = d.id;
          this.updateVisibility();
        })
      );
      menu.addItem((item) =>
        item.setTitle("Clear focus").onClick(() => {
          this.highlightedNodeId = null;
          this.updateVisibility();
        })
      );
      menu.showAtPosition({ x: event.clientX, y: event.clientY });
    });

    // Hover highlight
    node
      .on("mouseenter", (_event, d) => {
        const connectedIds = new Set<string>();
        connectedIds.add(d.id);
        links.forEach((l) => {
          const srcId = linkNodeId(l.source);
          const tgtId = linkNodeId(l.target);
          if (srcId === d.id) connectedIds.add(tgtId);
          if (tgtId === d.id) connectedIds.add(srcId);
        });

        node.classed("graph-node--dim", (n) => !connectedIds.has(n.id));
        link.classed("graph-link--dim", (l) => {
          const srcId = linkNodeId(l.source);
          const tgtId = linkNodeId(l.target);
          return srcId !== d.id && tgtId !== d.id;
        });
      })
      .on("mouseleave", () => {
        node.classed("graph-node--dim", false);
        link.classed("graph-link--dim", false);
      });

    // Force simulation
    this.simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(80)
      )
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collision", d3.forceCollide().radius((d) => radiusScale((d as SimNode).linkCount) + 8))
      .on("tick", () => {
        link
          .attr("x1", (d) => (d.source as SimNode).x ?? 0)
          .attr("y1", (d) => (d.source as SimNode).y ?? 0)
          .attr("x2", (d) => (d.target as SimNode).x ?? 0)
          .attr("y2", (d) => (d.target as SimNode).y ?? 0);

        node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

    // Initial zoom to fit
    svg.call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(0.8));
  }

  private dragBehavior(): d3.DragBehavior<SVGGElement, SimNode, SimNode | d3.SubjectPosition> {
    const sim = () => this.simulation;
    return d3
      .drag<SVGGElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) sim()?.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) sim()?.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }

  private nodeColor(n: GraphNode): string {
    switch (n.noteType) {
      case "structure":
        return "#ffd54f";
      case "permanent":
        return "#66bb6a";
      case "fleeting":
        return "#42a5f5";
      default:
        return "#bdbdbd";
    }
  }

  private truncateTitle(title: string, max: number): string {
    return title.length > max ? title.slice(0, max - 1) + "\u2026" : title;
  }

  private updateVisibility(): void {
    if (!this.svg) return;

    const query = this.searchQuery;

    // Node visibility based on search
    this.svg.selectAll<SVGGElement, SimNode>(".graph-node").each(function (d) {
      const matchesSearch =
        !query ||
        d.title.toLowerCase().includes(query) ||
        d.tags.some((t) => t.toLowerCase().includes(query));
      d3.select(this).classed("graph-node--filtered", !matchesSearch);
    });

    // Link visibility based on type filters
    this.svg
      .selectAll<SVGLineElement, SimLink>(".graph-link")
      .classed("graph-link--hidden", (d) => {
        return this.hiddenLinkTypes.has(d.linkType);
      });

    // Focus mode: dim everything not connected to highlighted node
    if (this.highlightedNodeId) {
      const focusId = this.highlightedNodeId;
      const connectedIds = new Set<string>();
      connectedIds.add(focusId);

      this.svg
        .selectAll<SVGLineElement, SimLink>(".graph-link")
        .each((d) => {
          const srcId = linkNodeId(d.source);
          const tgtId = linkNodeId(d.target);
          if (srcId === focusId) connectedIds.add(tgtId);
          if (tgtId === focusId) connectedIds.add(srcId);
        });

      this.svg
        .selectAll<SVGGElement, SimNode>(".graph-node")
        .classed("graph-node--dim", (d) => !connectedIds.has(d.id));
      this.svg
        .selectAll<SVGLineElement, SimLink>(".graph-link")
        .classed("graph-link--dim", (d) => {
          const srcId = linkNodeId(d.source);
          const tgtId = linkNodeId(d.target);
          return srcId !== focusId && tgtId !== focusId;
        });
    }
  }
}
