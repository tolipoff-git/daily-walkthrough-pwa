import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import pkg from './package.json';

let commitHash = '32e575a';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch {}

const buildTime = new Date().toISOString();
const appVersion = `v${pkg.version}`;

// Stamps the service worker cache name with the app version + build time,
// so every deploy forces old caches to be evicted (see public/sw.js).
const stampSwCache = {
  name: 'stamp-sw-cache',
  apply: 'build' as const,
  closeBundle() {
    try {
      const swPath = resolve(__dirname, 'dist/sw.js');
      const stamp = `ehs-pwa-${appVersion}-${buildTime.replace(/[^0-9]/g, '')}`;
      writeFileSync(swPath, readFileSync(swPath, 'utf8').replace(/ehs-pwa-__CACHE_STAMP__/g, stamp));
    } catch {}
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), stampSwCache],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __COMMIT_HASH__: JSON.stringify(commitHash),
    __BUILD_TIME__: JSON.stringify(buildTime),
    __REPO_URL__: JSON.stringify('https://github.com/tolipoff-git/daily-walkthrough-pwa'),
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          xlsx: ['xlsx'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
