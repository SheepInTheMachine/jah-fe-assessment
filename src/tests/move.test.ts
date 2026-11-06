import {describe, expect, it} from 'vitest';
import {canMoveInto, countDescendants, moveNode} from '../model/move';
import {indexTree} from '../model/tree';
import type {ContentNode} from '../model/types';

const fixture: ContentNode = {
    id: 'root',
    name: 'Site',
    type: 'site',
    children: [
        {
            id: 'products',
            name: 'Products',
            type: 'page',
            children: [
                {id: 'assets', name: 'Assets', type: 'folder', children: [
                    {id: 'logo', name: 'logo.svg', type: 'media', children: []}
                ]},
                {id: 'intro', name: 'Intro', type: 'content', children: []}
            ]
        },
        {id: 'news', name: 'News', type: 'page', children: []}
    ]
};

describe('countDescendants', () => {
    it('counts the whole subtree, the node excluded', () => {
        expect(countDescendants(fixture)).toBe(5);
        expect(countDescendants(fixture.children[0])).toBe(3);
    });
});

describe('canMoveInto', () => {
    const index = indexTree(fixture);

    it('rejects the node itself', () => {
        expect(canMoveInto(index, 'products', 'products')).toBe(false);
    });

    it('rejects the current parent', () => {
        expect(canMoveInto(index, 'products', 'root')).toBe(false);
    });

    it('rejects a child of the node', () => {
        expect(canMoveInto(index, 'products', 'assets')).toBe(false);
    });

    it('rejects a destination that is not a container', () => {
        expect(canMoveInto(index, 'assets', 'intro')).toBe(false);
        expect(canMoveInto(index, 'assets', 'logo')).toBe(false);
    });

    it('allows another container', () => {
        expect(canMoveInto(index, 'assets', 'news')).toBe(true);
    });
});

describe('moveNode', () => {
    it('moves the node under the destination as its last child', () => {
        const next = moveNode(fixture, 'assets', 'news');
        const news = next.children.find(child => child.id === 'news')!;
        expect(news.children[news.children.length - 1].id).toBe('assets');
        const products = next.children.find(child => child.id === 'products')!;
        expect(products.children.map(child => child.id)).toEqual(['intro']);
    });

    it('keeps the moved subtree intact', () => {
        const next = moveNode(fixture, 'assets', 'news');
        const news = next.children.find(child => child.id === 'news')!;
        const assets = news.children.find(child => child.id === 'assets')!;
        expect(assets.children.map(child => child.id)).toEqual(['logo']);
    });

    it('returns the tree unchanged when the source does not exist', () => {
        expect(moveNode(fixture, 'nope', 'news')).toBe(fixture);
    });

    it('does not mutate the input tree', () => {
        const before = JSON.stringify(fixture);
        moveNode(fixture, 'assets', 'news');
        expect(JSON.stringify(fixture)).toBe(before);
    });
});
