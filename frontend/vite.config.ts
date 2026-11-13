import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    proxy: {
      '/api': {
        target: process.env.API_TARGET || 'http://localhost:5050',
        changeOrigin: false,
      },
    },
  },
});
