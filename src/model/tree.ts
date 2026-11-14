import type {ContentNode} from './types';

export interface IndexedNode {
    node: ContentNode;
    parentId: string | null;
    depth: number;
}

export type TreeIndex = Map<string, IndexedNode>;

export function indexTree(root: ContentNode): TreeIndex {
    const index: TreeIndex = new Map();
    const stack: Array<{node: ContentNode; parentId: string | null; depth: number}> = [
        {node: root, parentId: null, depth: 1}
    ];
    while (stack.length > 0) {
        const {node, parentId, depth} = stack.pop()!;
        index.set(node.id, {node, parentId, depth});
        for (const child of node.children) {
            stack.push({node: child, parentId: node.id, depth: depth + 1});
        }
    }

    return index;
}

export function getDeepestCommonAncestor(index: TreeIndex, ids: Iterable<string>): string | null {
    const idList = [...ids];
    if (idList.length === 0) {
        return null;
    }

    const paths = idList.map(id => getPath(index, id));
    let commonLength = 0;
    const minLen = Math.min(...paths.map(path => path.length));
    for (let i = 0; i < minLen; i++) {
        const segment = paths[0][i];
        if (paths.every(path => path[i] === segment)) {
            commonLength = i + 1;
        } else {
            break;
        }
    }

    return commonLength > 0 ? paths[0][commonLength - 1]! : null;
}

export function getPath(index: TreeIndex, id: string): string[] {
    const path: string[] = [];
    let current: string | null = id;
    while (current !== null) {
        const entry: IndexedNode | undefined = index.get(current);
        if (!entry) {
            throw new Error(`Unknown node id: ${current}`);
        }

        path.unshift(current);
        current = entry.parentId;
    }

    return path;
}

export interface VisibleRow {
    node: ContentNode;
    depth: number;
    setSize: number;
    posInSet: number;
}

export function flattenVisible(root: ContentNode, expandedIds: ReadonlySet<string>): VisibleRow[] {
    const rows: VisibleRow[] = [];
    const visit = (node: ContentNode, depth: number, setSize: number, posInSet: number) => {
        rows.push({node, depth, setSize, posInSet});
        if (node.children.length > 0 && expandedIds.has(node.id)) {
            node.children.forEach((child, i) => visit(child, depth + 1, node.children.length, i + 1));
        }
    };

    visit(root, 1, 1, 1);
    return rows;
}

export function countNodes(root: ContentNode): number {
    let count = 0;
    const stack: ContentNode[] = [root];
    while (stack.length > 0) {
        const node = stack.pop()!;
        count += 1;
        for (const child of node.children) {
            stack.push(child);
        }
    }

    return count;
}
