import type {FocusEvent, KeyboardEvent} from 'react';
import {useCallback, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {flattenVisible} from '../model/tree';
import type {TreeIndex} from '../model/tree';
import type {ContentNode} from '../model/types';
import {canBeDestination} from '../move';
import {TreeRow} from './TreeRow';

export interface DestinationTreeProps {
    root: ContentNode;
    index: TreeIndex;
    selectedIds: ReadonlySet<string>;
    expandedIds: ReadonlySet<string>;
    onToggle: (id: string) => void;
    onChoose: (destinationId: string) => void;
}

/**
 * Single-purpose tree for picking a move destination. Invalid rows stay visible
 * but disabled; activating a valid row applies the move.
 */
export function DestinationTree({
    root,
    index,
    selectedIds,
    expandedIds,
    onToggle,
    onChoose
}: DestinationTreeProps) {
    const rows = useMemo(() => flattenVisible(root, expandedIds), [root, expandedIds]);
    const [focusedId, setFocusedId] = useState<string>(root.id);
    const containerRef = useRef<HTMLDivElement>(null);

    const isValid = useCallback(
        (id: string) => canBeDestination(index, selectedIds, id),
        [index, selectedIds]
    );

    const focusedIndex = rows.findIndex(row => row.node.id === focusedId);
    const safeFocusedId = focusedIndex === -1 ? rows[0]!.node.id : focusedId;

    useLayoutEffect(() => {
        containerRef.current?.querySelector<HTMLElement>(`[data-node-id="${safeFocusedId}"]`)?.focus();
    }, [safeFocusedId]);

    const activate = useCallback((id: string) => {
        if (isValid(id)) {
            onChoose(id);
        }
    }, [isValid, onChoose]);

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
        const indexInRows = rows.findIndex(row => row.node.id === safeFocusedId);
        if (indexInRows === -1) {
            return;
        }

        const row = rows[indexInRows]!;
        const expanded = expandedIds.has(row.node.id);
        switch (event.key) {
            case 'ArrowDown':
                if (indexInRows < rows.length - 1) {
                    setFocusedId(rows[indexInRows + 1]!.node.id);
                }

                break;
            case 'ArrowUp':
                if (indexInRows > 0) {
                    setFocusedId(rows[indexInRows - 1]!.node.id);
                }

                break;
            case 'ArrowRight':
                if (row.node.children.length > 0) {
                    if (expanded) {
                        setFocusedId(rows[indexInRows + 1]!.node.id);
                    } else {
                        onToggle(row.node.id);
                    }
                }

                break;
            case 'ArrowLeft':
                if (expanded && row.node.children.length > 0) {
                    onToggle(row.node.id);
                } else {
                    for (let i = indexInRows - 1; i >= 0; i--) {
                        if (rows[i]!.depth === row.depth - 1) {
                            setFocusedId(rows[i]!.node.id);
                            break;
                        }
                    }
                }

                break;
            case 'Home':
                setFocusedId(rows[0]!.node.id);
                break;
            case 'End':
                setFocusedId(rows[rows.length - 1]!.node.id);
                break;
            case 'Enter':
            case ' ':
                activate(row.node.id);
                break;
            default:
                return;
        }

        event.preventDefault();
    };

    return (
        <div
            ref={containerRef}
            role="tree"
            aria-label="Choose move destination"
            className="contentTree destinationTree"
            onFocusCapture={onFocusIn}
            onKeyDown={onKeyDown}
        >
            {rows.map(row => {
                const valid = isValid(row.node.id);
                return (
                    <TreeRow
                        key={row.node.id}
                        id={row.node.id}
                        name={row.node.name}
                        type={row.node.type}
                        depth={row.depth}
                        hasChildren={row.node.children.length > 0}
                        isExpanded={expandedIds.has(row.node.id)}
                        isSelected={false}
                        isFocused={row.node.id === safeFocusedId}
                        isDisabled={!valid}
                        setSize={row.setSize}
                        posInSet={row.posInSet}
                        onToggle={onToggle}
                        onSelect={(id, modifiers) => {
                            if (!modifiers.additive && !modifiers.range) {
                                activate(id);
                            }
                        }}
                    />
                );
            })}
        </div>
    );
}
