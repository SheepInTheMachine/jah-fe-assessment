import {Chip, Typography} from '@jahia/moonstone';
import type {TreeIndex} from '../model/tree';
import {getDeepestCommonAncestor, getPath} from '../model/tree';

export interface NodeDetailsProps {
    index: TreeIndex;
    selectedIds: ReadonlySet<string>;
}

function pathLabel(index: TreeIndex, id: string): string {
    return `/${getPath(index, id).map(pathId => index.get(pathId)!.node.name).join('/')}`;
}

export function NodeDetails({index, selectedIds}: NodeDetailsProps) {
    if (selectedIds.size === 0) {
        return (
            <aside aria-label="Node details" className="nodeDetails">
                <Typography variant="body">Select a node to see its details.</Typography>
            </aside>
        );
    }

    const ancestorId = getDeepestCommonAncestor(index, selectedIds);
    const ancestor = ancestorId ? index.get(ancestorId) : undefined;
    const selectedEntries = [...selectedIds]
        .map(id => index.get(id))
        .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
        .sort((a, b) => a.depth - b.depth || a.node.name.localeCompare(b.node.name));

    return (
        <aside aria-label="Node details" className="nodeDetails">
            {ancestor && (
                <section aria-label="Deepest common ancestor" className="nodeDetails_ancestor">
                    <Typography variant="heading">{ancestor.node.name}</Typography>
                    <Typography variant="body">Deepest common ancestor</Typography>
                    <Chip color="accent" label={ancestor.node.type}/>
                    <dl>
                        <dt>Path</dt>
                        <dd>{pathLabel(index, ancestor.node.id)}</dd>
                    </dl>
                </section>
            )}
            <section
                aria-label={`Selected nodes, ${selectedEntries.length} selected`}
                className="nodeDetails_selection"
            >
                <Typography variant="heading">
                    {selectedEntries.length === 1 ? 'Selected node' : `Selected nodes (${selectedEntries.length})`}
                </Typography>
                <ul className="nodeDetails_list">
                    {selectedEntries.map(entry => (
                        <li key={entry.node.id} className="nodeDetails_listItem">
                            <Typography variant="body">{entry.node.name}</Typography>
                            <Chip color="accent" label={entry.node.type}/>
                            <dl>
                                <dt>Path</dt>
                                <dd>{pathLabel(index, entry.node.id)}</dd>
                                <dt>Direct children</dt>
                                <dd>{entry.node.children.length}</dd>
                                <dt>Depth</dt>
                                <dd>{entry.depth}</dd>
                                <dt>Id</dt>
                                <dd>{entry.node.id}</dd>
                            </dl>
                        </li>
                    ))}
                </ul>
            </section>
        </aside>
    );
}
