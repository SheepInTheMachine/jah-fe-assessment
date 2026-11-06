import {Chip, Typography} from '@jahia/moonstone';
import type {TreeIndex} from '../model/tree';
import {getPath} from '../model/tree';

export interface NodeDetailsProps {
    index: TreeIndex;
    selectedId: string | null;
}

export function NodeDetails({index, selectedId}: NodeDetailsProps) {
    const entry = selectedId ? index.get(selectedId) : undefined;

    if (!entry) {
        return (
            <aside aria-label="Node details" className="nodeDetails">
                <Typography variant="body">Select a node to see its details.</Typography>
            </aside>
        );
    }

    const pathNames = getPath(index, entry.node.id).map(id => index.get(id)!.node.name);

    return (
        <aside aria-label="Node details" className="nodeDetails">
            <Typography variant="heading">{entry.node.name}</Typography>
            <Chip color="accent" label={entry.node.type}/>
            <dl>
                <dt>Path</dt>
                <dd>/{pathNames.join('/')}</dd>
                <dt>Direct children</dt>
                <dd>{entry.node.children.length}</dd>
                <dt>Depth</dt>
                <dd>{entry.depth}</dd>
                <dt>Id</dt>
                <dd>{entry.node.id}</dd>
            </dl>
        </aside>
    );
}
