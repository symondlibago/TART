import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Left off in dev: the service worker caches aggressively and makes
      // code changes look like they did not apply.
      devOptions: {
        enabled: false
      },
      manifest: {
        name: 'Event Tracker',
        short_name: 'Events',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0e1048',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split the big libraries out so they cache independently of app code:
        // a deploy that only changes a component should not invalidate React.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          charts: ['recharts'],
        },
      },
    },
  },
});
