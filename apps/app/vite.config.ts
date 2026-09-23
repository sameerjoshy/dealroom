import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served at apps.gtm-360.com/deal-room/ — the hub Worker routes the path here.
export default defineConfig({
  base: '/deal-room/',
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/deal-room/api': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
});
