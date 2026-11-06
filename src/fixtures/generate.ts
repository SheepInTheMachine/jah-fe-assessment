import type {ContentNode, NodeType} from '../model/types';

// mulberry32: tiny deterministic PRNG, so fixtures are identical on every machine.
function mulberry32(seed: number): () => number {
    let a = seed;
    return () => {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const NAME_POOLS: Record<Exclude<NodeType, 'site'>, string[]> = {
    page: ['Home', 'About', 'Products', 'News', 'Events', 'Careers', 'Contact', 'Services', 'Blog', 'Documentation'],
    folder: ['Assets', 'Documents', 'Images', 'Videos', 'Archives', 'Shared', 'Campaigns', 'Resources'],
    content: ['Article', 'Banner', 'Promo', 'FAQ Entry', 'Testimonial', 'Press Release', 'Rich Text', 'Quote'],
    media: ['hero-banner.jpg', 'team-photo.png', 'brochure.pdf', 'demo-video.mp4', 'logo.svg', 'datasheet.pdf']
};

// Containers get children; the other types are leaves.
const CONTAINER_TYPES: ReadonlySet<NodeType> = new Set(['site', 'page', 'folder']);

function pickType(random: () => number): Exclude<NodeType, 'site'> {
    const roll = random();
    if (roll < 0.3) {
        return 'page';
    }

    if (roll < 0.45) {
        return 'folder';
    }

    if (roll < 0.8) {
        return 'content';
    }

    return 'media';
}

const collator = new Intl.Collator('en', {numeric: true, sensitivity: 'base'});

function sortChildren(node: ContentNode): void {
    node.children.sort((a, b) => collator.compare(a.name, b.name));
    for (const child of node.children) {
        sortChildren(child);
    }
}

export function generateTree(seed: number, nodeCount: number): ContentNode {
    const random = mulberry32(seed);
    const root: ContentNode = {id: 'root', name: 'Digitall', type: 'site', children: []};
    const containers: ContentNode[] = [root];
    let counter = 1;

    while (counter < nodeCount) {
        const parent = containers[Math.floor(random() * containers.length)];
        const type = pickType(random);
        const pool = NAME_POOLS[type];
        const baseName = pool[Math.floor(random() * pool.length)];
        const node: ContentNode = {
            id: `n${counter}`,
            name: type === 'media' ? `${counter}-${baseName}` : `${baseName} ${counter}`,
            type,
            children: []
        };
        parent.children.push(node);
        if (CONTAINER_TYPES.has(type)) {
            containers.push(node);
        }

        counter += 1;
    }

    // Every level is kept in alphabetical order, the way an editor would expect to read it.
    sortChildren(root);
    return root;
}

export type FixtureName = 'small' | 'large';

export const FIXTURE_SIZES: Record<FixtureName, number> = {small: 50, large: 10000};

const FIXTURE_SEEDS: Record<FixtureName, number> = {small: 42, large: 1337};

const cache = new Map<FixtureName, ContentNode>();

export function getFixture(name: FixtureName): ContentNode {
    let tree = cache.get(name);
    if (!tree) {
        tree = generateTree(FIXTURE_SEEDS[name], FIXTURE_SIZES[name]);
        cache.set(name, tree);
    }

    return tree;
}
