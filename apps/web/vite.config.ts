import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Bind every interface so the dev server is reachable from a phone on the
    // same network, not just from this machine.
    host: true,
    // A tunnel presents its own hostname; Vite blocks unknown hosts by default.
    allowedHosts: true,
    // The SSE stream lives under /api/live/:id, so /api covers everything.
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
