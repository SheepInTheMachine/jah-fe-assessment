import {useCallback, useMemo, useState} from 'react';
import {ContentTree} from '../../components/ContentTree';
import {NodeDetails} from '../../components/NodeDetails';
import type {FixtureName} from '../../fixtures/generate';
import {getFixture} from '../../fixtures/generate';
import {indexTree} from '../../model/tree';
import {useTreeSelection} from '../../state/useTreeSelection';

export interface TreePerfHarnessProps {
    fixture: FixtureName;
    /** When true, every node is expanded (worst case for visible row count). */
    expandAll?: boolean;
}

export function TreePerfHarness({fixture, expandAll = false}: TreePerfHarnessProps) {
    const root = useMemo(() => getFixture(fixture), [fixture]);
    const index = useMemo(() => indexTree(root), [root]);
    const [expandedIds] = useState<ReadonlySet<string>>(() => (
        expandAll ? new Set(index.keys()) : new Set([root.id])
    ));
    const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
    const onSelectedIdsChange = useCallback((ids: string[]) => {
        setSelectedIds(new Set(ids));
    }, []);
    const {handleSelect} = useTreeSelection({
        root,
        expandedIds,
        selectedIds,
        onSelectedIdsChange
    });

    return (
        <>
            <ContentTree
                root={root}
                selectedIds={selectedIds}
                expandedIds={expandedIds}
                onSelect={handleSelect}
                onToggle={() => {}}
            />
            <NodeDetails index={index} selectedIds={selectedIds}/>
        </>
    );
}
