import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {NodeDetails} from '../components/NodeDetails';
import {indexTree} from '../model/tree';
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

const index = indexTree(fixture);

describe('NodeDetails', () => {
    it('prompts when nothing is selected', () => {
        render(<NodeDetails index={index} selectedIds={new Set()}/>);
        expect(screen.getByText('Select a node to see its details.')).toBeInTheDocument();
    });

    it('shows the deepest common ancestor and every selected node', () => {
        render(<NodeDetails index={index} selectedIds={new Set(['gamma', 'beta'])}/>);
        const ancestor = screen.getByRole('region', {name: 'Deepest common ancestor'});
        expect(ancestor).toHaveTextContent('Site');
        expect(ancestor).toHaveTextContent('/Site');
        expect(screen.getByRole('region', {name: 'Selected nodes, 2 selected'})).toBeInTheDocument();
        expect(screen.getByText('Gamma')).toBeInTheDocument();
        expect(screen.getByText('Beta')).toBeInTheDocument();
    });

    it('uses the selected node as the ancestor when only one node is selected', () => {
        render(<NodeDetails index={index} selectedIds={new Set(['alpha'])}/>);
        expect(screen.getByRole('region', {name: 'Deepest common ancestor'})).toHaveTextContent('Alpha');
        expect(screen.getByRole('region', {name: 'Selected nodes, 1 selected'})).toBeInTheDocument();
    });

    it('shows a nested ancestor when one selection is inside another', () => {
        render(<NodeDetails index={index} selectedIds={new Set(['alpha', 'gamma'])}/>);
        const ancestor = screen.getByRole('region', {name: 'Deepest common ancestor'});
        expect(ancestor).toHaveTextContent('Alpha');
        expect(ancestor).toHaveTextContent('/Site/Alpha');
    });
});
