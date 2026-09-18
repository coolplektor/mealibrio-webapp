import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['app-dev.mealibrio.com'],
    hmr: { host: 'app-dev.mealibrio.com', clientPort: 443, protocol: 'wss' }
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    maxWorkers: 2,
    env: { VITE_API_BASE_URL: 'https://api-dev.mealibrio.com' }
  }
});
