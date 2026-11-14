import type {TreeIndex} from './model/tree';
import {getPath} from './model/tree';
import type {ContentNode, NodeType} from './model/types';

export const CONTAINER_TYPES: ReadonlySet<NodeType> = new Set(['site', 'page', 'folder']);

const collator = new Intl.Collator('en', {numeric: true, sensitivity: 'base'});

export function getMoveRoots(index: TreeIndex, selectedIds: ReadonlySet<string>): string[] {
    return [...selectedIds].filter(id => {
        const path = getPath(index, id);
        return !path.slice(0, -1).some(ancestorId => selectedIds.has(ancestorId));
    });
}

function isInSubtree(index: TreeIndex, ancestorId: string, nodeId: string): boolean {
    return getPath(index, nodeId).includes(ancestorId);
}

export function canBeDestination(
    index: TreeIndex,
    selectedIds: ReadonlySet<string>,
    destinationId: string
): boolean {
    if (selectedIds.size === 0) {
        return false;
    }

    const entry = index.get(destinationId);
    if (!entry || !CONTAINER_TYPES.has(entry.node.type)) {
        return false;
    }

    const moveRoots = getMoveRoots(index, selectedIds);
    return moveRoots.every(rootId => !isInSubtree(index, rootId, destinationId));
}

function cloneNode(node: ContentNode): ContentNode {
    return {
        id: node.id,
        name: node.name,
        type: node.type,
        children: node.children.map(cloneNode)
    };
}

function sortChildrenAlphabetically(children: ContentNode[]): void {
    children.sort((a, b) => collator.compare(a.name, b.name));
}

function findNode(root: ContentNode, nodeId: string): ContentNode | null {
    if (root.id === nodeId) {
        return root;
    }

    for (const child of root.children) {
        const found = findNode(child, nodeId);
        if (found) {
            return found;
        }
    }

    return null;
}

function removeFromParent(root: ContentNode, nodeId: string): ContentNode | null {
    for (let i = 0; i < root.children.length; i++) {
        if (root.children[i]!.id === nodeId) {
            const [removed] = root.children.splice(i, 1);
            sortChildrenAlphabetically(root.children);
            return removed;
        }

        const removed = removeFromParent(root.children[i]!, nodeId);
        if (removed) {
            return removed;
        }
    }

    return null;
}

export function moveNodes(
    root: ContentNode,
    index: TreeIndex,
    selectedIds: ReadonlySet<string>,
    destinationId: string
): ContentNode {
    if (!canBeDestination(index, selectedIds, destinationId)) {
        throw new Error('Invalid move destination');
    }

    const newRoot = cloneNode(root);
    const moveRootIds = getMoveRoots(index, selectedIds).sort((a, b) => {
        const nameA = index.get(a)!.node.name;
        const nameB = index.get(b)!.node.name;
        return collator.compare(nameA, nameB);
    });

    const removedNodes: ContentNode[] = [];
    for (const id of moveRootIds) {
        const removed = removeFromParent(newRoot, id);
        if (removed) {
            removedNodes.push(removed);
        }
    }

    const destination = findNode(newRoot, destinationId);
    if (!destination) {
        throw new Error(`Unknown destination: ${destinationId}`);
    }

    destination.children.push(...removedNodes);
    sortChildrenAlphabetically(destination.children);
    return newRoot;
}
