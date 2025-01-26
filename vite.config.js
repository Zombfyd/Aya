import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
 plugins: [react()],
 server: {
   cors: true
 },
 build: {
   rollupOptions: {
     output: {
       manualChunks: undefined,
       format: 'es',
       entryFileNames: '[name].[hash].mjs',
       chunkFileNames: '[name].[hash].mjs',
       assetFileNames: '[name].[hash][extname]'
     }
   },
   assetsDir: 'assets',
   manifest: true,
   outDir: 'dist',
   emptyOutDir: true
 }
});
