import {waitFor} from '@testing-library/react';

export function formatMs(ms: number): string {
    return `${ms.toFixed(1)} ms`;
}

export interface MeasureUntilOptions {
    /** Passed to Testing Library waitFor (default 30_000). */
    pollTimeoutMs?: number;
}

/**
 * Runs `action`, then measures until `isDone` succeeds (polling like waitFor).
 * Duration is wall time from immediately before `action` through DOM meeting `isDone`.
 */
export async function measureUntil(
    action: () => void | Promise<void>,
    isDone: () => void,
    options: MeasureUntilOptions = {}
): Promise<{durationMs: number}> {
    const start = performance.now();
    await action();
    await waitFor(isDone, {timeout: options.pollTimeoutMs ?? 30_000});
    return {durationMs: performance.now() - start};
}
