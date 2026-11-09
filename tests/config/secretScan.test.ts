import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { afterEach, expect, it } from 'vitest';

const fixture = '.secret-scan-fixture.txt';
afterEach(() => rmSync(fixture, { force: true }));

it('fails when an untracked repository file contains a literal Ark key', () => {
  const fakeRealKey = `prod-${'A'.repeat(32)}`;
  writeFileSync(fixture, `ARK_API_KEY: "${fakeRealKey}"`);
  expect(() => execFileSync(process.execPath, ['scripts/check-secrets.mjs'], { stdio: 'pipe' })).toThrow();
});

it('scans ignored build output and quoted JSON keys', () => {
  mkdirSync('dist', { recursive: true });
  const outputFixture = 'dist/secret-scan-fixture.json';
  const fakeRealKey = `prod-${'B'.repeat(32)}`;
  writeFileSync(outputFixture, JSON.stringify({ [`ARK_${'API_KEY'}`]: fakeRealKey }));
  try { expect(() => execFileSync(process.execPath, ['scripts/check-secrets.mjs'], { stdio: 'pipe' })).toThrow(); }
  finally { rmSync(outputFixture, { force: true }); }
});
