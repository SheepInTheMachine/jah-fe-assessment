import {describe, expect, it} from 'vitest';
import {FIXTURE_SIZES, generateTree, getFixture} from '../fixtures/generate';
import {countNodes, flattenVisible, getDeepestCommonAncestor, getPath, indexTree} from '../model/tree';

describe('fixtures', () => {
    it('generates deterministic trees', () => {
        expect(JSON.stringify(generateTree(42, 50))).toBe(JSON.stringify(generateTree(42, 50)));
    });

    it('generates the advertised node counts', () => {
        expect(countNodes(getFixture('small'))).toBe(FIXTURE_SIZES.small);
        expect(countNodes(getFixture('large'))).toBe(FIXTURE_SIZES.large);
    });

    it('keeps every level in alphabetical order', () => {
        const collator = new Intl.Collator('en', {numeric: true, sensitivity: 'base'});
        const stack = [getFixture('large')];
        while (stack.length > 0) {
            const node = stack.pop()!;
            for (let i = 1; i < node.children.length; i++) {
                expect(collator.compare(node.children[i - 1].name, node.children[i].name)).toBeLessThanOrEqual(0);
            }

            stack.push(...node.children);
        }
    });
});

describe('indexTree / getPath', () => {
    const root = getFixture('small');
    const index = indexTree(root);

    it('indexes every node with a consistent parent link', () => {
        expect(index.size).toBe(FIXTURE_SIZES.small);
        for (const [id, entry] of index) {
            expect(entry.node.id).toBe(id);
            if (entry.parentId === null) {
                expect(id).toBe(root.id);
            } else {
                expect(index.get(entry.parentId)!.node.children).toContain(entry.node);
                expect(entry.depth).toBe(index.get(entry.parentId)!.depth + 1);
            }
        }
    });

    it('returns the path from the root to the node', () => {
        const someLeafId = [...index.keys()].find(id => index.get(id)!.depth >= 3)!;
        const path = getPath(index, someLeafId);
        expect(path[0]).toBe(root.id);
        expect(path[path.length - 1]).toBe(someLeafId);
        expect(path.length).toBe(index.get(someLeafId)!.depth);
    });

    it('throws on an unknown id', () => {
        expect(() => getPath(index, 'nope')).toThrow('Unknown node id');
    });
});

describe('getDeepestCommonAncestor', () => {
    const root = getFixture('small');
    const index = indexTree(root);

    it('returns null for an empty selection', () => {
        expect(getDeepestCommonAncestor(index, [])).toBeNull();
    });

    it('returns the node itself for a single id', () => {
        const leaf = [...index.entries()].find(([, entry]) => entry.node.children.length === 0)!;
        expect(getDeepestCommonAncestor(index, [leaf[0]])).toBe(leaf[0]);
    });

    it('returns the root when the selection spans different branches', () => {
        const depthTwo = [...index.entries()].filter(([, entry]) => entry.depth === 2).map(([id]) => id);
        expect(depthTwo.length).toBeGreaterThanOrEqual(2);
        expect(getDeepestCommonAncestor(index, depthTwo.slice(0, 2))).toBe(root.id);
    });

    it('returns the parent when one selected node contains another', () => {
        const nested = [...index.entries()].find(([, entry]) => {
            return entry.node.children.length > 0 && entry.node.children.some(child => child.children.length === 0);
        })!;
        const childId = nested[1].node.children[0]!.id;
        expect(getDeepestCommonAncestor(index, [nested[0], childId])).toBe(nested[0]);
    });
});

describe('flattenVisible', () => {
    const root = getFixture('small');

    it('shows only the root when nothing is expanded', () => {
        const rows = flattenVisible(root, new Set());
        expect(rows).toHaveLength(1);
        expect(rows[0].node.id).toBe(root.id);
        expect(rows[0].depth).toBe(1);
    });

    it('shows the children of an expanded node, with aria positions', () => {
        const rows = flattenVisible(root, new Set([root.id]));
        expect(rows).toHaveLength(1 + root.children.length);
        rows.slice(1).forEach((row, i) => {
            expect(row.depth).toBe(2);
            expect(row.setSize).toBe(root.children.length);
            expect(row.posInSet).toBe(i + 1);
        });
    });

    it('shows every node when everything is expanded', () => {
        const rows = flattenVisible(root, new Set(indexTree(root).keys()));
        expect(rows).toHaveLength(FIXTURE_SIZES.small);
    });
});
