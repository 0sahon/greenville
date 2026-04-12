import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
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
          globPatterns: ['**/*.{js,css,html,ico,svg,png,webp,jpg,jpeg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
        },
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
