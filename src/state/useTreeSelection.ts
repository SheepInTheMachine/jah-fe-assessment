import {useCallback, useLayoutEffect, useRef} from 'react';
import type {TreeSelectModifiers} from '../components/treeSelection';
import {flattenVisible} from '../model/tree';
import type {ContentNode} from '../model/types';

export interface UseTreeSelectionOptions {
    root: ContentNode;
    expandedIds: ReadonlySet<string>;
    selectedIds: ReadonlySet<string>;
    onSelectedIdsChange: (ids: string[]) => void;
}

/** Visible-order range, additive toggle, or replace selection. */
export function computeNextSelectedIds(
    root: ContentNode,
    expandedIds: ReadonlySet<string>,
    selectedIds: ReadonlySet<string>,
    anchorId: string | null,
    id: string,
    modifiers: TreeSelectModifiers
): string[] {
    if (modifiers.range && anchorId !== null) {
        const visibleIds = flattenVisible(root, expandedIds).map(row => row.node.id);
        const anchorIndex = visibleIds.indexOf(anchorId);
        const targetIndex = visibleIds.indexOf(id);
        if (anchorIndex === -1 || targetIndex === -1) {
            return [id];
        }

        const [start, end] = anchorIndex < targetIndex
            ? [anchorIndex, targetIndex]
            : [targetIndex, anchorIndex];
        return visibleIds.slice(start, end + 1);
    }

    if (modifiers.additive) {
        const toggled = new Set(selectedIds);
        if (toggled.has(id)) {
            toggled.delete(id);
        } else {
            toggled.add(id);
        }

        return [...toggled];
    }

    return [id];
}

/**
 * File-system-style tree selection (shift range, ctrl/cmd additive) with a stable
 * `handleSelect` so memoized tree rows are not invalidated on every selection change.
 */
export function useTreeSelection({
    root, expandedIds, selectedIds, onSelectedIdsChange
}: UseTreeSelectionOptions) {
    const anchorRef = useRef<string | null>(null);
    const rootRef = useRef(root);
    const expandedIdsRef = useRef(expandedIds);
    const selectedIdsRef = useRef(selectedIds);
    const onChangeRef = useRef(onSelectedIdsChange);

    useLayoutEffect(() => {
        rootRef.current = root;
        expandedIdsRef.current = expandedIds;
        selectedIdsRef.current = selectedIds;
        onChangeRef.current = onSelectedIdsChange;
    }, [expandedIds, onSelectedIdsChange, root, selectedIds]);

    const resetSelectionAnchor = useCallback(() => {
        anchorRef.current = null;
    }, []);

    const handleSelect = useCallback((id: string, modifiers: TreeSelectModifiers) => {
        const nextIds = computeNextSelectedIds(
            rootRef.current,
            expandedIdsRef.current,
            selectedIdsRef.current,
            anchorRef.current,
            id,
            modifiers
        );

        if (!modifiers.range) {
            anchorRef.current = id;
        }

        onChangeRef.current(nextIds);
    }, []);

    return {handleSelect, resetSelectionAnchor};
}
