import type {TreeIndex} from './tree';
import type {ContentNode, NodeType} from './types';

const CONTAINER_TYPES: ReadonlySet<NodeType> = new Set(['site', 'page', 'folder']);

/** Walks a subtree depth-first, the node itself excluded. */
export function* walk(node: ContentNode): Generator<ContentNode> {
    for (const child of node.children) {
        yield child;
        yield* walk(child);
    }
}

export function countDescendants(node: ContentNode): number {
    return [...walk(node)].length;
}

/**
 * A node can move into a container that is not itself, not its current
 * parent, and not one of its children.
 */
export function canMoveInto(index: TreeIndex, sourceId: string, targetId: string): boolean {
    const source = index.get(sourceId);
    const target = index.get(targetId);
    if (!source || !target) {
        return false;
    }

    if (!CONTAINER_TYPES.has(target.node.type)) {
        return false;
    }

    if (targetId === sourceId) {
        return false;
    }

    if (source.parentId === targetId) {
        // Already there.
        return false;
    }

    if (target.parentId === sourceId) {
        // Cannot move a node into one of its children.
        return false;
    }

    return true;
}

/** Returns a new tree where the source subtree hangs under the target node. */
export function moveNode(root: ContentNode, sourceId: string, targetId: string): ContentNode {
    let moved: ContentNode | null = null;

    const strip = (node: ContentNode): ContentNode => ({
        ...node,
        children: node.children
            .filter(child => {
                if (child.id === sourceId) {
                    moved = child;
                    return false;
                }

                return true;
            })
            .map(strip)
    });

    const stripped = strip(root);
    if (!moved) {
        return root;
    }

    const insert = (node: ContentNode): ContentNode => ({
        ...node,
        children: node.id === targetId ?
            [...node.children.map(insert), moved!] :
            node.children.map(insert)
    });

    return insert(stripped);
}
