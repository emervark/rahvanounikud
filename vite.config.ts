import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'web',
  publicDir: 'public',
  plugins: [
    react(),
    // Cloudflare'i plugin käivitab Workeri päris Workers-runtime'is ka arenduses,
    // nii et /api ja D1 käituvad kohapeal samamoodi nagu pärast deploy'd.
    cloudflare({
      configPath: path.join(root, 'wrangler.jsonc'),
      // Ilma selleta paneks plugin kohaliku D1 kausta web/.wrangler (Vite juur),
      // aga `wrangler d1 execute --local` kirjutab projekti juurde — tekiks kaks
      // eri andmebaasi ja skeem "kaoks" ära.
      persistState: { path: path.join(root, '.wrangler', 'state') },
    }),
  ],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
