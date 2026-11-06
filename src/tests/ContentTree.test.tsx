import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {ContentTree} from '../components/ContentTree';
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

function Harness({onSelect = () => {}}: {onSelect?: (id: string) => void}) {
    const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set(['root']));
    const [selectedId, setSelectedId] = useState<string | null>(null);
    return (
        <ContentTree
            root={fixture}
            selectedId={selectedId}
            expandedIds={expandedIds}
            onSelect={id => {
                setSelectedId(id);
                onSelect(id);
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
        expect(onSelect).toHaveBeenCalledWith('beta');
        expect(screen.getByRole('treeitem', {name: /Beta/}))
            .toHaveAttribute('aria-selected', 'true');
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
        expect(onSelect).toHaveBeenCalledWith('alpha');
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
