/** O(1) lookup — avoid `*ByRole` over 10k `treeitem` nodes in jsdom. */
export function getTreeRow(container: HTMLElement, nodeId: string): HTMLElement {
    const el = container.querySelector(`[data-node-id="${CSS.escape(nodeId)}"]`);
    if (!(el instanceof HTMLElement)) {
        throw new Error(`Tree row not found for id ${nodeId}`);
    }

    return el;
}
