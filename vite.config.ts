/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/tests/setup.ts'],
        exclude: process.env.VITEST_PERF === '1'
            ? ['**/node_modules/**']
            : ['**/node_modules/**', '**/selectionPerformance.large.test.tsx'],
        server: {
            deps: {
                // Moonstone ships ESM that imports its own CSS; it must go
                // through the Vite pipeline in tests too.
                inline: ['@jahia/moonstone']
            }
        }
    }
});
