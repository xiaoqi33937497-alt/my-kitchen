import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/my-kitchen/',
  plugins: [react(), VitePWA({ registerType: 'autoUpdate', manifest: { name: '我的厨房', short_name: '厨房', description: '本地食材库存与临期提醒', start_url: '/my-kitchen/', scope: '/my-kitchen/', theme_color: '#E8CECF', background_color: '#FBF9F8', display: 'standalone', icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }] } })],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**', '.worktrees/**'],
  },
});
