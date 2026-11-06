import type {KeyboardEvent} from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {flattenVisible} from '../model/tree';
import type {ContentNode} from '../model/types';
import {TreeRow} from './TreeRow';

export interface ContentTreeProps {
    root: ContentNode;
    selectedId: string | null;
    expandedIds: ReadonlySet<string>;
    onSelect: (id: string) => void;
    onToggle: (id: string) => void;
}

/**
 * WAI-ARIA tree with a roving tabindex: one row is tabbable, the arrow keys move
 * the focus, Enter or Space selects. Rows are rendered as a flat list of memoized
 * items so that a selection change only re-renders the two rows it touches.
 */
export function ContentTree({root, selectedId, expandedIds, onSelect, onToggle}: ContentTreeProps) {
    const rows = useMemo(() => flattenVisible(root, expandedIds), [root, expandedIds]);
    const [focusedId, setFocusedId] = useState<string>(root.id);
    const containerRef = useRef<HTMLDivElement>(null);

    // The focused row can disappear when a parent collapses or the fixture
    // changes, so every reader goes through this fallback instead of the state.
    const focusedIndex = rows.findIndex(row => row.node.id === focusedId);
    const safeFocusedId = focusedIndex === -1 ? rows[0].node.id : focusedId;

    // Move the DOM focus only when the tree already holds it, so rendering
    // the tree never steals the focus from the rest of the page.
    useEffect(() => {
        const container = containerRef.current;
        if (container && container.contains(document.activeElement)) {
            container.querySelector<HTMLElement>(`[data-node-id="${safeFocusedId}"]`)?.focus();
        }
    }, [safeFocusedId]);

    const handleSelect = useCallback((id: string) => {
        setFocusedId(id);
        onSelect(id);
    }, [onSelect]);

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
                handleSelect(row.node.id);
                break;
            default:
                return;
        }

        event.preventDefault();
    };

    return (
        <div ref={containerRef} role="tree" aria-label="Content tree" className="contentTree" onKeyDown={onKeyDown}>
            {rows.map(row => (
                <TreeRow
                    key={row.node.id}
                    id={row.node.id}
                    name={row.node.name}
                    type={row.node.type}
                    depth={row.depth}
                    hasChildren={row.node.children.length > 0}
                    isExpanded={expandedIds.has(row.node.id)}
                    isSelected={row.node.id === selectedId}
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
