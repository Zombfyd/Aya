import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: ['@mysten/sui', 'react', 'react-dom'], // Externalize large dependencies
    },
  },
});