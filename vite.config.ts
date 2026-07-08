import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'child_process';

let commitHash = 'unknown';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  console.warn('Could not get commit hash, using unknown');
}

export default defineConfig({
  server: {
    port: 3003,
  },
  define: {
    __APP_COMMIT_ID__: JSON.stringify(commitHash),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['mitra-logo.png', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Retribusi Petugas Bau-Bau',
        short_name: 'Petugas Retribusi',
        description: 'Aplikasi Petugas Pajak & Retribusi Kota Bau-Bau',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2d5cd5',
        orientation: 'portrait',
        lang: 'id',
        icons: [
          {
            src: '/mitra-logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/mitra-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
