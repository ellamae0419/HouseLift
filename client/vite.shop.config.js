import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const clientDir = path.dirname(fileURLToPath(import.meta.url));

// Builds the shop as its own website into client/dist-shop, separate from the
// dashboard site in client/dist. It reuses the same pages and settings (.env files).
export default defineConfig({
    root: path.join(clientDir, 'shop-site'),
    envDir: clientDir,
    // Its own dependency cache. The dashboard site's dev server keeps one in the same
    // project; sharing it makes the two servers overwrite each other and leaves one
    // showing a blank page ("Outdated Optimize Dep").
    cacheDir: path.join(clientDir, 'node_modules', '.vite-shop'),
    plugins: [react()],
    build: {
        outDir: path.join(clientDir, 'dist-shop'),
        emptyOutDir: true,
    },
    server: {
        port: 1235,
        host: true,
        // the shop pages live in ../src, outside this site's own folder
        fs: { allow: [clientDir] },
    },
});
