import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { env } from 'node:process';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    strictPort: true, // refuse de deriver vers 5175+ : sinon CORS casse
    proxy: {
      '/api': {
        // Le backend écoute sur 8080 par défaut; BACKEND_PORT permet de le déplacer.
        target: `http://localhost:${env.BACKEND_PORT || env.SERVER_PORT || 8080}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('recharts') || id.includes('d3-') || id.includes('d3/')) {
              return 'charts';
            }
            if (id.includes('date-fns')) {
              return 'date';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            if (id.includes('axios')) {
              return 'http';
            }
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
