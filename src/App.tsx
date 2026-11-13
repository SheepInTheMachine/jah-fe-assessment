import {useCallback, useMemo, useState} from 'react';
import {ContentTree} from './components/ContentTree';
import {NodeDetails} from './components/NodeDetails';
import {Toolbar} from './components/Toolbar';
import type {FixtureName} from './fixtures/generate';
import {getFixture} from './fixtures/generate';
import {countNodes, indexTree} from './model/tree';
import {useTreeSelection} from './state/useTreeSelection';
import {useUrlState} from './state/useUrlState';

export default function App() {
    const [urlState, updateUrl] = useUrlState();
    const root = getFixture(urlState.fixture);
    const index = useMemo(() => indexTree(root), [root]);
    const nodeCount = useMemo(() => countNodes(root), [root]);
    const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set([root.id]));

    const selectedIds = useMemo(() => {
        const next = new Set<string>();
        for (const id of urlState.selectedIds) {
            if (index.has(id)) {
                next.add(id);
            }
        }

        return next;
    }, [index, urlState.selectedIds]);

    const onSelectedIdsChange = useCallback((ids: string[]) => {
        updateUrl({selectedIds: ids});
    }, [updateUrl]);

    const {handleSelect, resetSelectionAnchor} = useTreeSelection({
        root,
        expandedIds,
        selectedIds,
        onSelectedIdsChange
    });

    const handleToggle = useCallback((id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }, []);

    const handleFixtureChange = useCallback((fixture: FixtureName) => {
        resetSelectionAnchor();
        updateUrl({fixture, selectedIds: []});
        setExpandedIds(new Set([getFixture(fixture).id]));
    }, [resetSelectionAnchor, updateUrl]);

    const handleExpandAll = useCallback(() => {
        setExpandedIds(new Set(index.keys()));
    }, [index]);

    const handleCollapseAll = useCallback(() => {
        setExpandedIds(new Set([root.id]));
    }, [root]);

    return (
        <div className="app">
            <Toolbar
                fixture={urlState.fixture}
                nodeCount={nodeCount}
                onFixtureChange={handleFixtureChange}
                onExpandAll={handleExpandAll}
                onCollapseAll={handleCollapseAll}
            />
            <main className="app_main">
                <ContentTree
                    root={root}
                    selectedIds={selectedIds}
                    expandedIds={expandedIds}
                    onSelect={handleSelect}
                    onToggle={handleToggle}
                />
                <NodeDetails index={index} selectedIds={selectedIds}/>
            </main>
        </div>
    );
}
