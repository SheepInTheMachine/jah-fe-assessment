import {useCallback, useMemo, useRef, useState} from 'react';
import {ContentTree} from './components/ContentTree';
import {MoveSelectionModal} from './components/MoveSelectionModal';
import {NodeDetails} from './components/NodeDetails';
import {Toolbar} from './components/Toolbar';
import type {FixtureName} from './fixtures/generate';
import {getFixture} from './fixtures/generate';
import {moveNodes} from './move';
import {countNodes, getPath, indexTree} from './model/tree';
import {useTreeSelection} from './state/useTreeSelection';
import {useUrlState} from './state/useUrlState';

export default function App() {
    const [urlState, updateUrl] = useUrlState();
    const [treeRoot, setTreeRoot] = useState(() => getFixture(urlState.fixture));
    const [moveModalOpen, setMoveModalOpen] = useState(false);
    const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
    const treeFocusRef = useRef<HTMLDivElement | null>(null);

    const root = treeRoot;
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
        const fixtureRoot = getFixture(fixture);
        setTreeRoot(fixtureRoot);
        setMoveModalOpen(false);
        updateUrl({fixture, selectedIds: []});
        setExpandedIds(new Set([fixtureRoot.id]));
    }, [resetSelectionAnchor, updateUrl]);

    const handleExpandAll = useCallback(() => {
        setExpandedIds(new Set(index.keys()));
    }, [index]);

    const handleCollapseAll = useCallback(() => {
        setExpandedIds(new Set([root.id]));
    }, [root]);

    const openMoveModal = useCallback(() => {
        if (selectedIds.size === 0) {
            return;
        }

        setMoveModalOpen(true);
    }, [selectedIds.size]);

    const handleMoveCancel = useCallback(() => {
        setMoveModalOpen(false);
    }, []);

    const handleMoveChoose = useCallback((destinationId: string) => {
        setMoveModalOpen(false);
        const nextRoot = moveNodes(root, index, selectedIds, destinationId);
        const nextIndex = indexTree(nextRoot);
        setTreeRoot(nextRoot);
        setExpandedIds(prev => {
            const next = new Set(prev);
            for (const id of getPath(nextIndex, destinationId)) {
                next.add(id);
            }

            return next;
        });
        setFocusNodeId(destinationId);
    }, [index, root, selectedIds]);

    const clearFocusNodeRequest = useCallback(() => {
        setFocusNodeId(null);
    }, []);

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
                    onRequestMove={selectedIds.size > 0 ? openMoveModal : undefined}
                    focusNodeId={focusNodeId}
                    onFocusNodeApplied={clearFocusNodeRequest}
                    treeFocusRef={treeFocusRef}
                    pauseFocusSync={moveModalOpen}
                />
                <NodeDetails
                    index={index}
                    selectedIds={selectedIds}
                    onOpenMove={selectedIds.size > 0 ? openMoveModal : undefined}
                />
            </main>
            {moveModalOpen && (
                <MoveSelectionModal
                    root={root}
                    index={index}
                    selectedIds={selectedIds}
                    expandedIds={expandedIds}
                    returnFocusRef={treeFocusRef}
                    onChoose={handleMoveChoose}
                    onCancel={handleMoveCancel}
                />
            )}
        </div>
    );
}
