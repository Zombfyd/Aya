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
     }
   },
   assetsDir: '',
   manifest: true,
   outDir: 'dist',
   emptyOutDir: true
 }
});
