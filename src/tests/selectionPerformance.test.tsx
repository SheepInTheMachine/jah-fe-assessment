import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';
import {formatMs, measureUntil} from './perf/measure';
import {TreePerfHarness} from './perf/TreePerfHarness';

/** Regression budget on the small fixture in jsdom (not comparable to browser on Large). */
const SMALL_CLICK_MS_BUDGET = 2_000;

describe('selection feedback latency (small fixture)', () => {
    it('reports ms from pointer click to aria-selected', async () => {
        const user = userEvent.setup();
        render(<TreePerfHarness fixture="small"/>);

        const target = screen.getByRole('treeitem', {name: /Article 8/});

        const {durationMs} = await measureUntil(async () => {
            await user.click(target);
        }, () => {
            expect(target).toHaveAttribute('aria-selected', 'true');
        });

        // eslint-disable-next-line no-console -- intentional timing output for VERIFICATION.md
        console.info(`[perf] small fixture, single click → aria-selected: ${formatMs(durationMs)}`);

        expect(durationMs).toBeLessThan(SMALL_CLICK_MS_BUDGET);
    });

    it('reports ms from shift+click range to aria-selected on both ends', async () => {
        const user = userEvent.setup();
        render(<TreePerfHarness fixture="small"/>);

        const anchor = screen.getByRole('treeitem', {name: /Article 8/});
        const end = screen.getByRole('treeitem', {name: /Rich Text 7/});

        await user.click(anchor);

        const {durationMs} = await measureUntil(async () => {
            await user.keyboard('{Shift>}');
            await user.click(end);
            await user.keyboard('{/Shift}');
        }, () => {
            expect(anchor).toHaveAttribute('aria-selected', 'true');
            expect(end).toHaveAttribute('aria-selected', 'true');
        });

        // eslint-disable-next-line no-console -- intentional timing output for VERIFICATION.md
        console.info(`[perf] small fixture, shift range → aria-selected: ${formatMs(durationMs)}`);

        expect(durationMs).toBeLessThan(SMALL_CLICK_MS_BUDGET);
    });
});
