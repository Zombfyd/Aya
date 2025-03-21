import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';
  const isTestnet = mode === 'testnet';
  const isDevTestnet = mode === 'dev.testnet';

  console.log(`Building for mode: ${mode}`);
  
  // For debugging environment variables
  if (isDevTestnet) {
    console.log('Using dev.testnet environment with variables:');
    Object.keys(process.env)
      .filter(key => key.startsWith('VITE_'))
      .forEach(key => {
        console.log(`${key}: ${process.env[key]}`);
      });
  }

  return {
    plugins: [react()],
    server: {
      cors: true,
      port: 6969,
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
      __DEV__: isDevelopment || isTestnet || isDevTestnet,
      __PROD__: isProduction,
      __TEST__: isTestnet || isDevTestnet
    }
  };
});
