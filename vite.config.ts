import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const hasPublicKey =
    Boolean(env.VITE_SUPABASE_ANON_KEY) || Boolean(env.VITE_SUPABASE_PUBLISHABLE_KEY);
  if (!env.VITE_SUPABASE_URL || !hasPublicKey) {
    throw new Error(
      'Missing required env vars: VITE_SUPABASE_URL and (VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY) must be set',
    );
  }
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['vite.svg'],
        manifest: {
          name: 'Greenville Montessori Schools',
          short_name: 'GMS Portal',
          description: 'School portal, LMS, grades, and communication',
          theme_color: '#be185d',
          background_color: '#fdf2f8',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/vite.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          // Pre-cache all static assets so the shell loads offline
          globPatterns: ['**/*.{js,css,html,ico,svg,png,webp,jpg,jpeg,woff2,woff,ttf}'],
          // SPA fallback — serve index.html for any navigation miss (offline routing)
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/rest\//, /^\/auth\//],
          runtimeCaching: [
            {
              // Supabase REST + Auth — network-first so data stays fresh, falls back to cache
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api',
                networkTimeoutSeconds: 10,
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 }, // 1 hour
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Google Fonts and other CDN assets — cache-first, long TTL
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        // Disable in dev — service workers cause confusing caching issues during development
        devOptions: { enabled: false },
      }),
    ],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
    },
  };
});
