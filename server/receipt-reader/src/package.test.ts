import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const packageRoot = existsSync(resolve(process.cwd(), 'run.sh'))
  ? process.cwd()
  : resolve(process.cwd(), 'server/receipt-reader');

describe('deployment package', () => {
  it('keeps the POSIX startup script free of carriage returns', async () => {
    const script = await readFile(`${packageRoot}/run.sh`);

    expect(script.includes(0x0d)).toBe(false);
  });

  it('declares compatibility with the cloud Node.js 20 runtime', async () => {
    const packageJson = JSON.parse(await readFile(`${packageRoot}/package.json`, 'utf8'));

    expect(packageJson.engines.node).toBe('>=20');
  });
});
