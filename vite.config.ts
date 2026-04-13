import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'child_process';

const commitHash = execSync('git rev-parse --short HEAD').toString().trim();

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
        theme_color: '#2d5cd5',
        icons: [
          {
            src: '/mitra-logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/mitra-logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
