import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      // Proxying /api requests to a local server (e.g., Vercel dev or a local Express server)
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path // Keeps /api in the path for Vercel compatibility
      }
    }
  }
});
