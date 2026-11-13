import {useCallback, useMemo, useRef, useState} from 'react';
import {ContentTree} from './components/ContentTree';
import {NodeDetails} from './components/NodeDetails';
import {Toolbar} from './components/Toolbar';
import type {FixtureName} from './fixtures/generate';
import {getFixture} from './fixtures/generate';
import {countNodes, flattenVisible, indexTree} from './model/tree';
import {useUrlState} from './state/useUrlState';

export default function App() {
    const [urlState, updateUrl] = useUrlState();
    const root = getFixture(urlState.fixture);
    const index = useMemo(() => indexTree(root), [root]);
    const nodeCount = useMemo(() => countNodes(root), [root]);
    const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set([root.id]));
    const selectionAnchorRef = useRef<string | null>(null);

    const selectedIds = useMemo(() => {
        const next = new Set<string>();
        for (const id of urlState.selectedIds) {
            if (index.has(id)) {
                next.add(id);
            }
        }

        return next;
    }, [index, urlState.selectedIds]);

    const handleSelect = useCallback((id: string, modifiers: {additive: boolean; range: boolean}) => {
        let nextIds: string[];

        if (modifiers.range && selectionAnchorRef.current !== null) {
            const visibleIds = flattenVisible(root, expandedIds).map(row => row.node.id);
            const anchorIndex = visibleIds.indexOf(selectionAnchorRef.current);
            const targetIndex = visibleIds.indexOf(id);
            if (anchorIndex === -1 || targetIndex === -1) {
                nextIds = [id];
            } else {
                const [start, end] = anchorIndex < targetIndex
                    ? [anchorIndex, targetIndex]
                    : [targetIndex, anchorIndex];
                nextIds = visibleIds.slice(start, end + 1);
            }
        } else if (modifiers.additive) {
            const toggled = new Set(selectedIds);
            if (toggled.has(id)) {
                toggled.delete(id);
            } else {
                toggled.add(id);
            }

            nextIds = [...toggled];
        } else {
            nextIds = [id];
        }

        if (!modifiers.range) {
            selectionAnchorRef.current = id;
        }

        updateUrl({selectedIds: nextIds});
    }, [expandedIds, root, selectedIds, updateUrl]);

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
        selectionAnchorRef.current = null;
        updateUrl({fixture, selectedIds: []});
        setExpandedIds(new Set([getFixture(fixture).id]));
    }, [updateUrl]);

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
