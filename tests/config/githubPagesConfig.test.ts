import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('GitHub Pages configuration', () => {
  it('uses the repository base path in Vite and React Router', () => {
    const viteConfig = readFileSync('vite.config.ts', 'utf8');
    const main = readFileSync('src/main.tsx', 'utf8');

    expect(viteConfig).toContain("base: '/my-kitchen/'");
    expect(main).toContain('basename={import.meta.env.BASE_URL}');
  });

  it('publishes the production bundle with a Pages fallback', () => {
    const workflow = readFileSync('.github/workflows/deploy-pages.yml', 'utf8');

    expect(workflow).toContain('pnpm build');
    expect(workflow).toContain('cp dist/index.html dist/404.html');
    expect(workflow).toContain('actions/deploy-pages@v4');
  });
});
