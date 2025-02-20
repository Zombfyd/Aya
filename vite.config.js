import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
 plugins: [react()],
 server: {
   cors: true,
   port: 3000,
   strictPort: true
 },
 build: {
   rollupOptions: {
     output: {
       entryFileNames: 'index.[hash].mjs',
       chunkFileNames: '[name].[hash].mjs',
       assetFileNames: '[name].[hash][extname]'
     }
   },
   assetsDir: '',
   manifest: true,
   outDir: 'dist',
   emptyOutDir: true
 }
});
