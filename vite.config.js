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
       entryFileNames: 'index.[hash].mjs',
       chunkFileNames: '[name].[hash].mjs',
       assetFileNames: '[name].[hash][extname]'
     }
   },
   assetsDir: '',
   manifest: true,
   outDir: 'dist',
   emptyOutDir: true,
   commonjsOptions: {
     include: [/node_modules/],
     transformMixedEsModules: true
   }
 },
 resolve: {
   mainFields: ['module', 'main'],
   alias: {
     '@mysten/sui.js': '@mysten/sui.js/dist/index.js'
   }
 },
 optimizeDeps: {
   include: ['@mysten/sui.js']
 }
});
