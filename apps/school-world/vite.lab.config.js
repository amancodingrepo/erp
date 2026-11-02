import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Isolated lab web process only. It proxies to the lab API container rather
// than localhost:3001, which remains the user's normal development API.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['lab-web'],
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_LAB_API_TARGET || 'http://lab-api:3001',
        changeOrigin: true
      }
    }
  }
});
