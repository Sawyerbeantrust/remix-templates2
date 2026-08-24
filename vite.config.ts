import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    define: {
      'process.env.WP_BASE_URL': JSON.stringify(process.env.WP_BASE_URL || 'https://car-lifts.co.za'),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      fs: {
        allow: ['..'],
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        usePolling: process.env.DISABLE_HMR === 'true' ? true : false,
      },
    },
  };
});
