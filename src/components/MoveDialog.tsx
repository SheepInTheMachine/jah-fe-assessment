import type {CSSProperties} from 'react';
import {Button, Typography} from '@jahia/moonstone';
import {canMoveInto, countDescendants} from '../model/move';
import type {TreeIndex} from '../model/tree';
import type {ContentNode, NodeType} from '../model/types';

const CONTAINER_TYPES: ReadonlySet<NodeType> = new Set(['site', 'page', 'folder']);

export interface MoveDialogProps {
    root: ContentNode;
    index: TreeIndex;
    sourceId: string;
    onMove: (targetId: string) => void;
    onClose: () => void;
}

interface DestinationRow {
    id: string;
    name: string;
    depth: number;
    enabled: boolean;
}

export function MoveDialog({root, index, sourceId, onMove, onClose}: MoveDialogProps) {
    const source = index.get(sourceId)!;

    const rows: DestinationRow[] = [];
    const visit = (node: ContentNode, depth: number) => {
        if (!CONTAINER_TYPES.has(node.type)) {
            return;
        }

        rows.push({
            id: node.id,
            name: node.name,
            depth,
            enabled: canMoveInto(index, sourceId, node.id)
        });
        for (const child of node.children) {
            visit(child, depth + 1);
        }
    };

    visit(root, 1);

    return (
        <div className="moveDialog_backdrop" onClick={onClose}>
            <div role="dialog" className="moveDialog" onClick={event => event.stopPropagation()}>
                <Typography variant="heading">Move &quot;{source.node.name}&quot;</Typography>
                <Typography variant="caption">
                    The node and its {countDescendants(source.node)} descendants will move to the destination you pick. Destinations that are not allowed are grayed out.
                </Typography>
                <div className="moveDialog_list">
                    {rows.map(row => (
                        <div
                            key={row.id}
                            className={row.enabled ? 'moveDialog_item' : 'moveDialog_item moveDialog_item_disabled'}
                            style={{'--depth': row.depth} as CSSProperties}
                            onClick={() => {
                                if (row.enabled) {
                                    onMove(row.id);
                                }
                            }}
                        >
                            {row.name}
                        </div>
                    ))}
                </div>
                <div className="moveDialog_footer">
                    <Button label="Cancel" variant="outlined" onClick={onClose}/>
                </div>
            </div>
        </div>
    );
}
