import { Plugin } from "obsidian";
import { SlipboxGraphView, VIEW_TYPE } from "./graph-view";

export default class SlipboxGraphPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerView(VIEW_TYPE, (leaf) => new SlipboxGraphView(leaf));

    this.addRibbonIcon("git-fork", "Open Slipbox Graph", () => {
      this.activateView();
    });

    this.addCommand({
      id: "open-slipbox-graph",
      name: "Open semantic graph",
      callback: () => this.activateView(),
    });
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  private async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        leaf = rightLeaf;
        await leaf.setViewState({ type: VIEW_TYPE, active: true });
      }
    }
    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
}
