/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/tests/setup.ts'],
        server: {
            deps: {
                // Moonstone ships ESM that imports its own CSS; it must go
                // through the Vite pipeline in tests too.
                inline: ['@jahia/moonstone']
            }
        }
    }
});
