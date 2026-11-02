import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: process.env.SCHOOL_WORLD_BASE || '/',
  build: {
    outDir: process.env.SCHOOL_WORLD_OUT || 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: resolve(projectRoot, 'index.html'),
        performanceReportLab: resolve(projectRoot, 'lab/performance-report/index.html')
      }
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
    proxy: { '/api': { target: process.env.ERP_API_TARGET || 'http://127.0.0.1:3000', changeOrigin: true } }
  }
});
