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
          assetFileNames: (assetInfo) => {
            // Preserve the original path structure for audio files
            if (assetInfo.name.match(/\.(wav|mp3)$/)) {
              return assetInfo.name;
            }
            return '[name].[hash][extname]';
          }
        }
      },
      assetsDir: '',
      manifest: true,
      outDir: 'dist',
      emptyOutDir: true,
      copyPublicDir: true, // Ensure public directory is copied
      assetsInlineLimit: 0 // Never inline assets
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
