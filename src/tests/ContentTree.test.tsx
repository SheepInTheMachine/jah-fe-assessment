import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useCallback, useRef, useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {ContentTree} from '../components/ContentTree';
import type {TreeSelectModifiers} from '../components/treeSelection';
import {flattenVisible} from '../model/tree';
import type {ContentNode} from '../model/types';

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

function useTreeSelection(expandedIds: ReadonlySet<string>) {
    const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
    const anchorRef = useRef<string | null>(null);

    const applySelection = useCallback((id: string, modifiers: TreeSelectModifiers) => {
        const visibleIds = flattenVisible(fixture, expandedIds).map(row => row.node.id);
        let next: Set<string>;

        if (modifiers.range && anchorRef.current !== null) {
            const anchorIndex = visibleIds.indexOf(anchorRef.current);
            const targetIndex = visibleIds.indexOf(id);
            if (anchorIndex === -1 || targetIndex === -1) {
                next = new Set([id]);
            } else {
                const [start, end] = anchorIndex < targetIndex
                    ? [anchorIndex, targetIndex]
                    : [targetIndex, anchorIndex];
                next = new Set(visibleIds.slice(start, end + 1));
            }
        } else if (modifiers.additive) {
            next = new Set(selectedIds);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
        } else {
            next = new Set([id]);
        }

        if (!modifiers.range) {
            anchorRef.current = id;
        }

        setSelectedIds(next);
        return next;
    }, [expandedIds, selectedIds]);

    return {selectedIds, applySelection};
}

function Harness({onSelect = () => {}}: {onSelect?: (id: string, modifiers: TreeSelectModifiers) => void}) {
    const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set(['root']));
    const {selectedIds, applySelection} = useTreeSelection(expandedIds);
    return (
        <ContentTree
            root={fixture}
            selectedIds={selectedIds}
            expandedIds={expandedIds}
            onSelect={(id, modifiers) => {
                applySelection(id, modifiers);
                onSelect(id, modifiers);
            }}
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
        />
    );
}

describe('ContentTree', () => {
    it('renders the visible rows as a WAI-ARIA tree', () => {
        render(<Harness/>);
        expect(screen.getByRole('tree', {name: 'Content tree'})).toBeInTheDocument();
        const items = screen.getAllByRole('treeitem');
        expect(items).toHaveLength(3);
        expect(items[0]).toHaveAttribute('aria-level', '1');
        expect(items[1]).toHaveAttribute('aria-level', '2');
        expect(screen.queryByText('Gamma')).not.toBeInTheDocument();
    });

    it('expands a node from its chevron button', async () => {
        const user = userEvent.setup();
        render(<Harness/>);
        await user.click(screen.getByRole('button', {name: 'Expand Alpha'}));
        expect(screen.getByText('Gamma')).toBeInTheDocument();
        expect(screen.getByRole('treeitem', {name: /Alpha/}))
            .toHaveAttribute('aria-expanded', 'true');
    });

    it('selects a node on click', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        render(<Harness onSelect={onSelect}/>);
        await user.click(screen.getByText('Beta'));
        expect(onSelect).toHaveBeenCalledWith('beta', {additive: false, range: false});
        expect(screen.getByRole('treeitem', {name: /Beta/}))
            .toHaveAttribute('aria-selected', 'true');
    });

    it('toggles a node in the selection with ctrl+click', async () => {
        const user = userEvent.setup();
        render(<Harness/>);
        await user.click(screen.getByText('Beta'));
        await user.keyboard('{Control>}');
        await user.click(screen.getByText('Alpha'));
        await user.keyboard('{/Control}');
        expect(screen.getByRole('treeitem', {name: /Beta/})).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('treeitem', {name: /Alpha/})).toHaveAttribute('aria-selected', 'true');
    });

    it('selects a visible range with shift+click', async () => {
        const user = userEvent.setup();
        render(<Harness/>);
        await user.click(screen.getByText('Beta'));
        await user.keyboard('{Shift>}');
        await user.click(screen.getByText('Alpha'));
        await user.keyboard('{/Shift}');
        expect(screen.getByRole('treeitem', {name: /Alpha/})).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('treeitem', {name: /Beta/})).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('treeitem', {name: /Site/})).toHaveAttribute('aria-selected', 'false');
    });

    it('moves the focus with the arrow keys and selects with Enter', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        render(<Harness onSelect={onSelect}/>);
        const [rootRow] = screen.getAllByRole('treeitem');
        rootRow.focus();
        await user.keyboard('{ArrowDown}');
        expect(screen.getByRole('treeitem', {name: /Alpha/})).toHaveFocus();
        await user.keyboard('{Enter}');
        expect(onSelect).toHaveBeenCalledWith('alpha', {additive: false, range: false});
    });

    it('toggles selection with control+space', async () => {
        const user = userEvent.setup();
        render(<Harness/>);
        const [rootRow] = screen.getAllByRole('treeitem');
        rootRow.focus();
        await user.keyboard('{ArrowDown}{Control>}{ }{/Control}');
        expect(screen.getByRole('treeitem', {name: /Alpha/})).toHaveAttribute('aria-selected', 'true');
        await user.keyboard('{Control>}{ }{/Control}');
        expect(screen.getByRole('treeitem', {name: /Alpha/})).toHaveAttribute('aria-selected', 'false');
    });

    it('expands a collapsed node with ArrowRight', async () => {
        const user = userEvent.setup();
        render(<Harness/>);
        const [rootRow] = screen.getAllByRole('treeitem');
        rootRow.focus();
        await user.keyboard('{ArrowDown}{ArrowRight}');
        expect(screen.getByText('Gamma')).toBeInTheDocument();
        expect(screen.getByRole('treeitem', {name: /Alpha/}))
            .toHaveAttribute('aria-expanded', 'true');
    });
});
