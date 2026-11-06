import {useCallback, useMemo, useState} from 'react';
import {ContentTree} from './components/ContentTree';
import {MoveDialog} from './components/MoveDialog';
import {NodeDetails} from './components/NodeDetails';
import {Toolbar} from './components/Toolbar';
import type {FixtureName} from './fixtures/generate';
import {getFixture} from './fixtures/generate';
import {moveNode} from './model/move';
import {countNodes, indexTree} from './model/tree';
import type {ContentNode} from './model/types';
import {useUrlState} from './state/useUrlState';

export default function App() {
    const [urlState, updateUrl] = useUrlState();
    const [root, setRoot] = useState<ContentNode>(() => getFixture(urlState.fixture));
    const index = useMemo(() => indexTree(root), [root]);
    const nodeCount = useMemo(() => countNodes(root), [root]);
    const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set([root.id]));
    const [movingId, setMovingId] = useState<string | null>(null);

    // A selection bookmarked on one fixture may not exist on the other.
    const selectedId = urlState.selectedId && index.has(urlState.selectedId) ? urlState.selectedId : null;

    const handleSelect = useCallback((id: string) => {
        updateUrl({selectedId: id});
    }, [updateUrl]);

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
        updateUrl({fixture, selectedId: null});
        setRoot(getFixture(fixture));
        setExpandedIds(new Set([getFixture(fixture).id]));
    }, [updateUrl]);

    const handleExpandAll = useCallback(() => {
        setExpandedIds(new Set(index.keys()));
    }, [index]);

    const handleCollapseAll = useCallback(() => {
        setExpandedIds(new Set([root.id]));
    }, [root]);

    const handleMoveRequest = useCallback((id: string) => {
        setMovingId(id);
    }, []);

    const handleMove = useCallback((targetId: string) => {
        if (movingId) {
            setRoot(prev => moveNode(prev, movingId, targetId));
        }

        setMovingId(null);
    }, [movingId]);

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
                    selectedId={selectedId}
                    expandedIds={expandedIds}
                    onSelect={handleSelect}
                    onToggle={handleToggle}
                    onMoveRequest={handleMoveRequest}
                />
                <NodeDetails index={index} selectedId={selectedId}/>
            </main>
            {movingId && (
                <MoveDialog
                    root={root}
                    index={index}
                    sourceId={movingId}
                    onMove={handleMove}
                    onClose={() => setMovingId(null)}
                />
            )}
        </div>
    );
}
