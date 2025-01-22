import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@mysten/sui.js': '@mysten/sui.js/dist/index.mjs',
    }
  },
  optimizeDeps: {
    include: ['@mysten/sui.js']
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  }
});
