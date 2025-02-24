import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';
  const isTestnet = mode === 'testnet';

  return {
    plugins: [react()],
    server: {
      cors: true,
      port: 3000,
      strictPort: true,
      host: true // Enable access from local network
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
    },
    publicDir: 'public',
    assetsInclude: ['**/*.wav', '**/*.mp3'], // Include audio files
    envDir: '.',
    define: {
      __DEV__: isDevelopment || isTestnet,
      __PROD__: isProduction,
      __TEST__: isTestnet
    }
  };
});
