import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Explicit host/clientPort avoids WS 400 when Vite binds 0.0.0.0.
      hmr: process.env.DISABLE_HMR === 'true'
        ? false
        : {
            protocol: 'ws',
            host: 'localhost',
            port: 3001,
            clientPort: 3001,
          },
    },
  };
});
