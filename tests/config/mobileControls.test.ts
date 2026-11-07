import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('mobile control styles', () => {
  const css = readFileSync('src/styles/global.css', 'utf8');

  it('centers the manual-add action as one visual group', () => {
    expect(css).toMatch(/\.manual-add-action\{[^}]*display:flex/);
    expect(css).toMatch(/\.manual-add-action\{[^}]*align-items:center/);
    expect(css).toMatch(/\.manual-add-action\{[^}]*justify-content:center/);
  });

  it('uses phone-friendly inventory filter dimensions', () => {
    expect(css).toMatch(/\.inventory-filters select\{[^}]*min-height:48px/);
    expect(css).toMatch(/\.inventory-filters select\{[^}]*font-size:16px/);
  });
});
