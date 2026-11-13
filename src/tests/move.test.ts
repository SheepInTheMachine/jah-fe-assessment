import {describe, expect, it} from 'vitest';
import {indexTree} from '../model/tree';
import type {ContentNode} from '../model/types';
import {canBeDestination, getMoveRoots, moveNodes} from '../move';

const collator = new Intl.Collator('en', {numeric: true, sensitivity: 'base'});

function expectSortedChildren(node: ContentNode): void {
    for (let i = 1; i < node.children.length; i++) {
        expect(collator.compare(node.children[i - 1]!.name, node.children[i]!.name)).toBeLessThanOrEqual(0);
    }

    for (const child of node.children) {
        expectSortedChildren(child);
    }
}

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
                {id: 'gamma', name: 'Gamma', type: 'content', children: []},
                {id: 'folder-a',
                    name: 'Assets',
                    type: 'folder',
                    children: [
                        {id: 'nested', name: 'Nested', type: 'content', children: []}
                    ]}
            ]
        },
        {id: 'beta', name: 'Beta', type: 'folder', children: []}
    ]
};

describe('getMoveRoots', () => {
    const index = indexTree(fixture);

    it('returns every id when the selection has no ancestor pairs', () => {
        expect(getMoveRoots(index, new Set(['beta', 'gamma']))).toEqual(
            expect.arrayContaining(['beta', 'gamma'])
        );
    });

    it('collapses an ancestor and descendant to the ancestor only', () => {
        expect(getMoveRoots(index, new Set(['alpha', 'gamma']))).toEqual(['alpha']);
    });
});

describe('canBeDestination', () => {
    const index = indexTree(fixture);

    it('rejects empty selections and non-container types', () => {
        expect(canBeDestination(index, new Set(), 'beta')).toBe(false);
        expect(canBeDestination(index, new Set(['gamma']), 'gamma')).toBe(false);
    });

    it('rejects destinations inside the subtree of a moving node', () => {
        expect(canBeDestination(index, new Set(['alpha']), 'gamma')).toBe(false);
        expect(canBeDestination(index, new Set(['alpha']), 'alpha')).toBe(false);
        expect(canBeDestination(index, new Set(['alpha']), 'folder-a')).toBe(false);
    });

    it('allows a container outside the moving subtrees', () => {
        expect(canBeDestination(index, new Set(['gamma']), 'beta')).toBe(true);
        expect(canBeDestination(index, new Set(['alpha']), 'beta')).toBe(true);
        expect(canBeDestination(index, new Set(['gamma']), 'root')).toBe(true);
    });
});

describe('moveNodes', () => {
    const index = indexTree(fixture);

    it('throws when the destination is invalid', () => {
        expect(() => moveNodes(fixture, index, new Set(['alpha']), 'gamma')).toThrow('Invalid move destination');
    });

    it('moves multiple roots and keeps alphabetical child order', () => {
        const next = moveNodes(fixture, index, new Set(['gamma', 'beta']), 'root');
        expectSortedChildren(next);
        const rootChildren = next.children.map(child => child.id);
        expect(rootChildren).toContain('beta');
        expect(rootChildren).toContain('alpha');
        expect(next.children.find(child => child.id === 'beta')).toBeDefined();
        const alpha = next.children.find(child => child.id === 'alpha')!;
        expect(alpha.children.map(child => child.id)).toEqual(['folder-a']);
    });

    it('moves an ancestor subtree when both ancestor and descendant are selected', () => {
        const next = moveNodes(fixture, index, new Set(['alpha', 'gamma']), 'beta');
        const beta = next.children.find(child => child.id === 'beta')!;
        expect(beta.children.map(child => child.id)).toEqual(['alpha']);
        const movedAlpha = beta.children[0]!;
        expect(movedAlpha.children.map(child => child.id)).toEqual(expect.arrayContaining(['gamma', 'folder-a']));
    });

    it('preserves nested structure when moving a single leaf', () => {
        const next = moveNodes(fixture, index, new Set(['gamma']), 'beta');
        const beta = next.children.find(child => child.id === 'beta')!;
        expect(beta.children).toHaveLength(1);
        expect(beta.children[0]!.id).toBe('gamma');
        const alpha = next.children.find(child => child.id === 'alpha')!;
        expect(alpha!.children.map(child => child.id)).toEqual(['folder-a']);
    });
});
