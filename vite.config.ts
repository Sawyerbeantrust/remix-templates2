import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
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
      // ADD THIS PROXY BLOCK to fix the /assets/images path
      proxy: {
        '/assets/images': {
          target: 'http://localhost:5173',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/assets\/images/, '/images'),
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        usePolling: process.env.DISABLE_HMR === 'true' ? true : false,
      },
    },
  };
});
