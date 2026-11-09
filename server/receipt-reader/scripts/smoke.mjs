import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const port = await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const address = probe.address();
    if (!address || typeof address === 'string') return reject(new Error('Unable to reserve port'));
    probe.close(() => resolve(address.port));
  });
});
const origin = 'https://smoke.example';
const child = spawn(process.execPath, ['dist/server.cjs'], { env: { ...process.env, PORT: String(port), ARK_API_KEY: 'test-key', ARK_MODEL_ID: 'test-model', ALLOWED_ORIGIN: origin }, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = '';
child.stdout.on('data', (chunk) => { logs += chunk; });
child.stderr.on('data', (chunk) => { logs += chunk; });
try {
  let response;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Bundle exited early (${child.exitCode}): ${logs}`);
    try { response = await fetch(`http://127.0.0.1:${port}/v1/receipts/analyze`, { method: 'OPTIONS', headers: { Origin: origin } }); break; } catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  if (!response || response.status !== 204 || response.headers.get('access-control-allow-origin') !== origin) throw new Error(`Bundle smoke request failed: ${logs}`);
  console.log('Receipt server bundle smoke test passed');
} finally {
  child.kill();
  await new Promise((resolve) => child.once('exit', resolve));
}
