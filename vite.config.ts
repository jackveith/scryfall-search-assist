import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


export default defineConfig({
    build: {
        rollupOptions: {
            // Multiple entry points
            input: {
                background: resolve(__dirname, 'src/background/background.ts'),
                content: resolve(__dirname, 'src/content/content.ts'),
                popup: resolve(__dirname, 'src/popup/popup.ts'),
                options: resolve(__dirname, 'src/options/options.ts')
            },
            output: {
                dir: 'dist',
                format: 'esm',
                entryFileNames: '[name].js'
            }
        },
        sourcemap: true,
        outDir: 'dist', // match tsconfig outDir
        emptyOutDir: true
    }
});
