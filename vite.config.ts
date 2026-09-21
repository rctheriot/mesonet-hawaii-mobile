/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolveRegion } from './src/config/regions.data';

// This file runs under Node, where `import.meta.env` does not exist — so it reads
// VITE_APP_DATA via loadEnv and resolves the region from the env-free data module
// (`src/config/regions.data.ts`), NOT from `src/config/regions.ts`.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Throws on an unknown id: a typo in a Cloudflare Pages env var must fail the
  // build rather than quietly ship one region's data under another's domain.
  const region = resolveRegion(env.VITE_APP_DATA);

  return {
    // Per-region icons. Vite copies publicDir's *contents* to the dist root, so
    // `/favicon.png` etc. keep working and nothing downstream needs region-aware paths.
    publicDir: `public/${region.assetDir}`,

    // Unit tests run in a plain Node environment — current suites cover pure
    // utility functions only. Add a jsdom environment later when testing components.
    test: {
      environment: 'node',
      globals: false,
      include: ['src/**/*.test.ts'],
    },
    plugins: [
      react(),
      tailwindcss(),
      {
        // index.html carries %VITE_APP_NAME% / %VITE_APP_DESCRIPTION%. Those are
        // derived from VITE_APP_DATA rather than set as their own env vars, so a
        // Pages project only ever needs the one region variable.
        name: 'region-html-vars',
        // order:'pre' so this runs BEFORE Vite's built-in HTML env replacement.
        // Otherwise Vite sees the unresolved placeholders first and warns
        // "%VITE_APP_NAME% is not defined in env variables" on every build.
        transformIndexHtml: {
          order: 'pre' as const,
          handler(html: string) {
            return html
              .replaceAll('%VITE_APP_NAME%', region.appName)
              .replaceAll('%VITE_APP_DESCRIPTION%', region.description);
          },
        },
      },
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'apple-touch-icon.png'],
        manifest: {
          name: region.appName,
          short_name: region.shortName,
          description: region.description,
          theme_color: '#0ea5e9',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
    ],
  };
});
