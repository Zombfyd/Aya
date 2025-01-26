import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
 plugins: [react()],
 server: {
   cors: {
     origin: "https://www.ayaonsui.xyz",
     methods: ['GET', 'POST'],
     credentials: true
   }
 }
});
