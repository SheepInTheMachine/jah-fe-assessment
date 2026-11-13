import {render} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';
import {getFixture} from '../fixtures/generate';
import {flattenVisible, indexTree} from '../model/tree';
import {formatMs, measureUntil} from './perf/measure';
import {getTreeRow} from './perf/treeRow';
import {TreePerfHarness} from './perf/TreePerfHarness';

/**
 * Optional jsdom stress run: `npm run test:perf`
 *
 * Failures here usually mean the **test harness** is struggling (mounting or
 * querying 10k DOM nodes), not that the browser app is slow. Record real UX
 * numbers in VERIFICATION.md from Chrome on `npm run dev`.
 */
const LARGE_TEST_MS = 600_000;
const LARGE_POLL_MS = 120_000;

function largeFixtureVisibleIds(): string[] {
    const root = getFixture('large');
    const index = indexTree(root);
    return flattenVisible(root, new Set(index.keys())).map(row => row.node.id);
}

const visibleIds = largeFixtureVisibleIds();
const singleSelectId = visibleIds[5_000]!;
const rangeAnchorId = visibleIds[5_000]!;
const rangeEndId = visibleIds[5_001]!;

describe('selection feedback latency (large fixture)', () => {
    it('reports click and shift-range timings (fully expanded)', async () => {
        const user = userEvent.setup();
        const mountStart = performance.now();
        const {container} = render(<TreePerfHarness fixture="large" expandAll/>);
        const mountMs = performance.now() - mountStart;
        const domRowCount = container.querySelectorAll('[data-node-id]').length;
        expect(domRowCount).toBe(visibleIds.length);
        expect(visibleIds.length).toBe(10_000);
        // eslint-disable-next-line no-console -- timing for local / VERIFICATION comparison
        console.info(`[perf] large fixture (jsdom), mount ${domRowCount} rows: ${formatMs(mountMs)}`);

        const row = (nodeId: string) => getTreeRow(container, nodeId);

        for (const id of [singleSelectId, rangeEndId]) {
            row(id);
        }

        const singleTarget = row(singleSelectId);

        const single = await measureUntil(async () => {
            await user.click(singleTarget);
        }, () => {
            expect(singleTarget).toHaveAttribute('aria-selected', 'true');
        }, {pollTimeoutMs: LARGE_POLL_MS});

        const anchor = row(rangeAnchorId);
        const end = row(rangeEndId);
        await user.click(anchor);

        const range = await measureUntil(async () => {
            await user.keyboard('{Shift>}');
            await user.click(end);
            await user.keyboard('{/Shift}');
        }, () => {
            expect(anchor).toHaveAttribute('aria-selected', 'true');
            expect(end).toHaveAttribute('aria-selected', 'true');
        }, {pollTimeoutMs: LARGE_POLL_MS});

        // eslint-disable-next-line no-console -- timing for local / VERIFICATION comparison
        console.info(
            `[perf] large fixture (jsdom), click ${singleSelectId} → aria-selected: ${formatMs(single.durationMs)}`
        );
        // eslint-disable-next-line no-console -- timing for local / VERIFICATION comparison
        console.info(
            `[perf] large fixture (jsdom), shift range ${rangeAnchorId}–${rangeEndId} → aria-selected: ${formatMs(range.durationMs)}`
        );

        expect(Number.isFinite(single.durationMs)).toBe(true);
        expect(Number.isFinite(range.durationMs)).toBe(true);
    }, LARGE_TEST_MS);
});
