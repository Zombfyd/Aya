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
       manualChunks: undefined
     }
   },
   assetsDir: 'assets',
   manifest: true,
   outDir: 'dist',
   emptyOutDir: true
 }
});
