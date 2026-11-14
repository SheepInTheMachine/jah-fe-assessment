import {Button, Typography} from '@jahia/moonstone';
import type {KeyboardEvent, RefObject} from 'react';
import {useCallback, useId, useRef, useState} from 'react';
import type {TreeIndex} from '../model/tree';
import type {ContentNode} from '../model/types';
import {DestinationTree} from './DestinationTree';

export interface MoveSelectionModalProps {
    root: ContentNode;
    index: TreeIndex;
    selectedIds: ReadonlySet<string>;
    expandedIds: ReadonlySet<string>;
    returnFocusRef: RefObject<HTMLElement | null>;
    onChoose: (destinationId: string) => void;
    onCancel: () => void;
}

export function MoveSelectionModal({
    root,
    index,
    selectedIds,
    expandedIds,
    returnFocusRef,
    onChoose,
    onCancel
}: MoveSelectionModalProps) {
    const titleId = useId();
    const descriptionId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const [modalExpandedIds, setModalExpandedIds] = useState<ReadonlySet<string>>(() => new Set(expandedIds));

    const handleCancel = useCallback(() => {
        onCancel();
        returnFocusRef.current?.focus();
    }, [onCancel, returnFocusRef]);

    const handleChoose = useCallback((destinationId: string) => {
        onChoose(destinationId);
    }, [onChoose]);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            handleCancel();
        }
    }, [handleCancel]);

    const handleModalToggle = useCallback((id: string) => {
        setModalExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }, []);

    return (
        <div className="moveModal_backdrop" onMouseDown={event => {
            if (event.target === event.currentTarget) {
                handleCancel();
            }
        }}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                className="moveModal"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
            >
                <Typography id={titleId} variant="heading">Move Selection</Typography>
                <Typography id={descriptionId} variant="body">
                    Choose a container destination. Invalid destinations are disabled.
                    {' '}
                    <span className="moveModal_shortcut">Ctrl+Shift+M</span>
                    {' '}
                    also opens this dialog from the tree.
                </Typography>
                <DestinationTree
                    root={root}
                    index={index}
                    selectedIds={selectedIds}
                    expandedIds={modalExpandedIds}
                    onToggle={handleModalToggle}
                    onChoose={handleChoose}
                />
                <div className="moveModal_actions">
                    <Button label="Cancel" variant="outlined" onClick={handleCancel}/>
                </div>
            </div>
        </div>
    );
}
