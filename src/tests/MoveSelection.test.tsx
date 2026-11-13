import {render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useCallback, useMemo, useRef, useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {ContentTree} from '../components/ContentTree';
import {MoveSelectionModal} from '../components/MoveSelectionModal';
import {NodeDetails} from '../components/NodeDetails';
import {getPath, indexTree} from '../model/tree';
import type {ContentNode} from '../model/types';
import {moveNodes} from '../move';
import {useTreeSelection} from '../state/useTreeSelection';

const fixture: ContentNode = {
    id: 'root',
    name: 'Site',
    type: 'site',
    children: [
        {
            id: 'alpha',
            name: 'Alpha',
            type: 'page',
            children: [
                {id: 'gamma', name: 'Gamma', type: 'content', children: []}
            ]
        },
        {id: 'beta', name: 'Beta', type: 'folder', children: []}
    ]
};

function MoveHarness() {
    const [root, setRoot] = useState(fixture);
    const index = useMemo(() => indexTree(root), [root]);
    const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set(['root', 'alpha']));
    const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set(['gamma']));
    const [moveOpen, setMoveOpen] = useState(false);
    const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
    const treeFocusRef = useRef<HTMLDivElement | null>(null);

    const onSelectedIdsChange = useCallback((ids: string[]) => {
        setSelectedIds(new Set(ids));
    }, []);
    const {handleSelect} = useTreeSelection({
        root,
        expandedIds,
        selectedIds,
        onSelectedIdsChange
    });

    const openMove = useCallback(() => setMoveOpen(true), []);
    const handleChoose = useCallback((destinationId: string) => {
        setMoveOpen(false);
        setRoot(prev => {
            const next = moveNodes(prev, indexTree(prev), selectedIds, destinationId);
            setExpandedIds(expanded => {
                const wider = new Set(expanded);
                for (const id of getPath(indexTree(next), destinationId)) {
                    wider.add(id);
                }

                return wider;
            });
            return next;
        });
        setFocusNodeId(destinationId);
    }, [selectedIds]);

    return (
        <>
            <ContentTree
                root={root}
                selectedIds={selectedIds}
                expandedIds={expandedIds}
                onSelect={handleSelect}
                onToggle={id => {
                    setExpandedIds(prev => {
                        const next = new Set(prev);
                        if (next.has(id)) {
                            next.delete(id);
                        } else {
                            next.add(id);
                        }

                        return next;
                    });
                }}
                onRequestMove={openMove}
                focusNodeId={focusNodeId}
                onFocusNodeApplied={() => setFocusNodeId(null)}
                treeFocusRef={treeFocusRef}
                pauseFocusSync={moveOpen}
            />
            <NodeDetails index={index} selectedIds={selectedIds} onOpenMove={openMove}/>
            {moveOpen && (
                <MoveSelectionModal
                    root={root}
                    index={index}
                    selectedIds={selectedIds}
                    expandedIds={expandedIds}
                    returnFocusRef={treeFocusRef}
                    onChoose={handleChoose}
                    onCancel={() => setMoveOpen(false)}
                />
            )}
        </>
    );
}

describe('Move selection UI', () => {
    it('opens the modal from the Move Selection button', async () => {
        const user = userEvent.setup();
        render(<MoveHarness/>);
        await user.click(screen.getByRole('button', {name: 'Move Selection'}));
        expect(screen.getByRole('dialog', {name: /Move Selection/i})).toBeInTheDocument();
        expect(screen.getByRole('tree', {name: 'Choose move destination'})).toBeInTheDocument();
    });

    it('opens the modal with Ctrl+Shift+M when the tree is focused', async () => {
        const user = userEvent.setup();
        render(<MoveHarness/>);
        screen.getByRole('tree', {name: 'Content tree'}).focus();
        await user.keyboard('{Control>}{Shift>}m{/Shift}{/Control}');
        expect(screen.getByRole('dialog', {name: /Move Selection/i})).toBeInTheDocument();
    });

    it('moves focus into the destination tree when opened from the keyboard shortcut', async () => {
        const user = userEvent.setup();
        render(<MoveHarness/>);
        const mainTree = screen.getByRole('tree', {name: 'Content tree'});
        within(mainTree).getByRole('treeitem', {name: /Gamma/}).focus();
        await user.keyboard('{Control>}{Shift>}m{/Shift}{/Control}');
        const dialog = screen.getByRole('dialog');
        const destinationTree = within(dialog).getByRole('tree', {name: 'Choose move destination'});
        await waitFor(() => {
            expect(within(destinationTree).getByRole('treeitem', {name: /Site/})).toHaveFocus();
        });
        expect(mainTree).not.toContain(document.activeElement);
    });

    it('moves on pointer selection and focuses the destination in the main tree', async () => {
        const user = userEvent.setup();
        render(<MoveHarness/>);
        await user.click(screen.getByRole('button', {name: 'Move Selection'}));
        const modalTree = screen.getByRole('tree', {name: 'Choose move destination'});
        await user.click(within(modalTree).getByText('Beta'));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByRole('treeitem', {name: /Beta/})).toHaveFocus();
        });
        expect(screen.getByRole('treeitem', {name: /Gamma/})).toBeInTheDocument();
    });

    it('applies the move when activating a valid destination from the keyboard', async () => {
        const user = userEvent.setup();
        render(<MoveHarness/>);
        await user.click(screen.getByRole('button', {name: 'Move Selection'}));
        const dialog = screen.getByRole('dialog');
        const modalTree = within(dialog).getByRole('tree');
        within(modalTree).getByRole('treeitem', {name: /Site/}).focus();
        await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByRole('treeitem', {name: /Beta/})).toHaveFocus();
        });
    });

    it('returns focus to the main tree when the user cancels', async () => {
        const user = userEvent.setup();
        render(<MoveHarness/>);
        const mainTree = screen.getByRole('tree', {name: 'Content tree'});
        mainTree.focus();
        await user.keyboard('{Control>}{Shift>}m{/Shift}{/Control}');
        await user.click(screen.getByRole('button', {name: 'Cancel'}));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(mainTree.contains(document.activeElement)).toBe(true);
    });

    it('marks non-container and self-subtree destinations as disabled', async () => {
        const user = userEvent.setup();
        render(<MoveHarness/>);
        await user.click(screen.getByRole('button', {name: 'Move Selection'}));
        const modalTree = screen.getByRole('tree', {name: 'Choose move destination'});
        expect(within(modalTree).getByRole('treeitem', {name: /Gamma/}))
            .toHaveAttribute('aria-disabled', 'true');
        expect(within(modalTree).getByRole('treeitem', {name: /Beta/}))
            .not.toHaveAttribute('aria-disabled', 'true');
    });

    it('does not move when clicking a disabled destination', async () => {
        const user = userEvent.setup();
        const log = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<MoveHarness/>);
        await user.click(screen.getByRole('button', {name: 'Move Selection'}));
        const modalTree = screen.getByRole('tree', {name: 'Choose move destination'});
        await user.click(within(modalTree).getByText('Gamma'));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        log.mockRestore();
    });
});
