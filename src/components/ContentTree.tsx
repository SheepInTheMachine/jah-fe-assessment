import type {FocusEvent, KeyboardEvent, MutableRefObject} from 'react';
import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {flattenVisible} from '../model/tree';
import type {ContentNode} from '../model/types';
import {TreeRow} from './TreeRow';
import type {TreeSelectModifiers} from './treeSelection';

export interface ContentTreeProps {
    root: ContentNode;
    selectedIds: ReadonlySet<string>;
    expandedIds: ReadonlySet<string>;
    onSelect: (id: string, modifiers: TreeSelectModifiers) => void;
    onToggle: (id: string) => void;
    onRequestMove?: () => void;
    focusNodeId?: string | null;
    onFocusNodeApplied?: () => void;
    treeFocusRef?: MutableRefObject<HTMLDivElement | null>;
    /** When true, the main tree will not move DOM focus (e.g. while a modal is open). */
    pauseFocusSync?: boolean;
}

/**
 * WAI-ARIA tree with a roving tabindex: one row is tabbable, the arrow keys move
 * the focus, Enter or Space selects. Rows are rendered as a flat list of memoized
 * items so that a selection change only re-renders the two rows it touches.
 */
export function ContentTree({
    root, selectedIds, expandedIds, onSelect, onToggle, onRequestMove, focusNodeId, onFocusNodeApplied, treeFocusRef,
    pauseFocusSync = false
}: ContentTreeProps) {
    const rows = useMemo(() => flattenVisible(root, expandedIds), [root, expandedIds]);
    const [focusedId, setFocusedId] = useState<string>(root.id);
    const containerRef = useRef<HTMLDivElement | null>(null) as MutableRefObject<HTMLDivElement | null>;

    // The focused row can disappear when a parent collapses or the fixture
    // changes, so every reader goes through this fallback instead of the state.
    const activeFocusId = focusNodeId ?? focusedId;
    const focusedIndex = rows.findIndex(row => row.node.id === activeFocusId);
    const safeFocusedId = focusedIndex === -1 ? rows[0]!.node.id : activeFocusId;

    // Move the DOM focus only when the tree already holds it, so rendering
    // the tree never steals the focus from the rest of the page.
    useEffect(() => {
        if (pauseFocusSync) {
            return;
        }

        const container = containerRef.current;
        if (container && container.contains(document.activeElement)) {
            container.querySelector<HTMLElement>(`[data-node-id="${safeFocusedId}"]`)?.focus();
        }
    }, [pauseFocusSync, safeFocusedId]);

    useLayoutEffect(() => {
        if (!focusNodeId || !rows.some(row => row.node.id === focusNodeId)) {
            return;
        }

        containerRef.current?.querySelector<HTMLElement>(`[data-node-id="${focusNodeId}"]`)?.focus();
        onFocusNodeApplied?.();
    }, [focusNodeId, onFocusNodeApplied, rows]);

    const setContainerRef = useCallback((node: HTMLDivElement | null) => {
        containerRef.current = node;
        if (treeFocusRef) {
            treeFocusRef.current = node;
        }
    }, [treeFocusRef]);

    const handleSelect = useCallback((id: string, modifiers: TreeSelectModifiers) => {
        setFocusedId(id);
        onSelect(id, modifiers);
    }, [onSelect]);

    const onFocusIn = useCallback((event: FocusEvent<HTMLDivElement>) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        const row = target.closest<HTMLElement>('[data-node-id]');
        if (row?.dataset.nodeId) {
            setFocusedId(row.dataset.nodeId);
        }
    }, []);

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const index = rows.findIndex(row => row.node.id === safeFocusedId);
        if (index === -1) {
            return;
        }

        const row = rows[index];
        const isExpanded = expandedIds.has(row.node.id);
        switch (event.key) {
            case 'ArrowDown':
                if (index < rows.length - 1) {
                    setFocusedId(rows[index + 1].node.id);
                }

                break;
            case 'ArrowUp':
                if (index > 0) {
                    setFocusedId(rows[index - 1].node.id);
                }

                break;
            case 'ArrowRight':
                if (row.node.children.length > 0) {
                    if (isExpanded) {
                        setFocusedId(rows[index + 1].node.id);
                    } else {
                        onToggle(row.node.id);
                    }
                }

                break;
            case 'ArrowLeft':
                if (isExpanded && row.node.children.length > 0) {
                    onToggle(row.node.id);
                } else {
                    for (let i = index - 1; i >= 0; i--) {
                        if (rows[i].depth === row.depth - 1) {
                            setFocusedId(rows[i].node.id);
                            break;
                        }
                    }
                }

                break;
            case 'Home':
                setFocusedId(rows[0].node.id);
                break;
            case 'End':
                setFocusedId(rows[rows.length - 1].node.id);
                break;
            case 'Enter':
            case ' ':
                handleSelect(row.node.id, {
                    additive: event.ctrlKey || event.metaKey,
                    range: event.shiftKey
                });
                break;
            case 'm':
            case 'M':
                if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
                    onRequestMove?.();
                    event.preventDefault();
                }

                return;
            default:
                return;
        }

        event.preventDefault();
    };

    return (
        <div
            ref={setContainerRef}
            role="tree"
            aria-label="Content tree"
            className="contentTree"
            tabIndex={-1}
            onFocusCapture={onFocusIn}
            onKeyDown={onKeyDown}
        >
            {rows.map(row => (
                <TreeRow
                    key={row.node.id}
                    id={row.node.id}
                    name={row.node.name}
                    type={row.node.type}
                    depth={row.depth}
                    hasChildren={row.node.children.length > 0}
                    isExpanded={expandedIds.has(row.node.id)}
                    isSelected={selectedIds.has(row.node.id)}
                    isFocused={row.node.id === safeFocusedId}
                    setSize={row.setSize}
                    posInSet={row.posInSet}
                    onToggle={onToggle}
                    onSelect={handleSelect}
                />
            ))}
        </div>
    );
}
