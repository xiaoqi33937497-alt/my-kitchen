import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createServer } from './server.js';
import jpeg from 'jpeg-js';

const origin = 'https://xiaoqi33937497-alt.github.io';
const jpeg16 = Buffer.from(jpeg.encode({ width: 16, height: 16, data: Buffer.alloc(16 * 16 * 4) }, 80).data).toString('base64');
const servers: Array<ReturnType<typeof createServer>> = [];

async function start(overrides: Parameters<typeof createServer>[0] = {}) {
  const server = createServer({
    env: { ARK_API_KEY: 'secret-test-key', ARK_MODEL_ID: 'doubao-test', ALLOWED_ORIGIN: origin },
    analyze: vi.fn().mockResolvedValue({ items: [{ name: '鸡蛋' }] }),
    ...overrides,
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  return `http://127.0.0.1:${port}/v1/receipts/analyze`;
}

function validBody(extra: Record<string, unknown> = {}) {
  return JSON.stringify({ image: { mimeType: 'image/jpeg', base64: jpeg16 }, clientDate: '2026-11-08', ...extra });
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe('receipt reader server', () => {
  it('answers strict CORS preflight for the allowed origin', async () => {
    const url = await start();
    const response = await fetch(url, { method: 'OPTIONS', headers: { Origin: origin } });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(origin);
  });

  it('rejects disallowed origins and methods', async () => {
    const url = await start();
    expect((await fetch(url, { method: 'POST', headers: { Origin: 'https://evil.example', 'content-type': 'application/json' }, body: validBody() })).status).toBe(403);
    expect((await fetch(url, { method: 'GET', headers: { Origin: origin } })).status).toBe(405);
  });

  it('rejects malformed JSON and MIME or magic-byte mismatches', async () => {
    const url = await start();
    const headers = { Origin: origin, 'content-type': 'application/json' };
    expect((await fetch(url, { method: 'POST', headers, body: '{' })).status).toBe(400);
    expect((await fetch(url, { method: 'POST', headers, body: JSON.stringify({ image: { mimeType: 'image/png', base64: jpeg16 }, clientDate: '2026-11-08' }) })).status).toBe(415);
  });

  it('rejects truncated or implausibly large images before calling Ark', async () => {
    const analyze = vi.fn();
    const url = await start({ analyze });
    const headers = { Origin: origin, 'content-type': 'application/json' };
    const truncatedJpeg = Buffer.from([0xff, 0xd8, 0xff]).toString('base64');
    const hugeJpeg = Buffer.from(jpeg16, 'base64');
    const sof = hugeJpeg.indexOf(Buffer.from([0xff, 0xc0]));
    hugeJpeg.writeUInt16BE(20_000, sof + 5);
    hugeJpeg.writeUInt16BE(20_000, sof + 7);
    expect((await fetch(url, { method: 'POST', headers, body: JSON.stringify({ image: { mimeType: 'image/jpeg', base64: truncatedJpeg }, clientDate: '2026-11-08' }) })).status).toBe(415);
    expect((await fetch(url, { method: 'POST', headers, body: JSON.stringify({ image: { mimeType: 'image/jpeg', base64: hugeJpeg.toString('base64') }, clientDate: '2026-11-08' }) })).status).toBe(415);
    expect(analyze).not.toHaveBeenCalled();
  });

  it('rejects a structurally incomplete JPEG without pixel data', async () => {
    const analyze = vi.fn();
    const url = await start({ analyze });
    const noPixelData = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const response = await fetch(url, { method: 'POST', headers: { Origin: origin, 'content-type': 'application/json' }, body: JSON.stringify({ image: { mimeType: 'image/jpeg', base64: noPixelData.toString('base64') }, clientDate: '2026-11-08' }) });
    expect(response.status).toBe(415);
    expect(analyze).not.toHaveBeenCalled();
  });

  it('rejects decoded images over 4 MiB before calling Ark', async () => {
    const analyze = vi.fn();
    const url = await start({ analyze });
    const response = await fetch(url, { method: 'POST', headers: { Origin: origin, 'content-type': 'application/json' }, body: JSON.stringify({ image: { mimeType: 'image/jpeg', base64: Buffer.alloc(4 * 1024 * 1024 + 1).toString('base64') }, clientDate: '2026-11-08' }) });
    expect(response.status).toBe(413);
    expect(analyze).not.toHaveBeenCalled();
  });

  it('normalizes a successful response without leaking secrets or image data', async () => {
    const url = await start();
    const response = await fetch(url, { method: 'POST', headers: { Origin: origin, 'content-type': 'application/json' }, body: validBody() });
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).not.toContain('secret-test-key');
    expect(text).not.toContain(jpeg16);
    expect(JSON.parse(text).items[0]).toMatchObject({ name: '鸡蛋', category: 'other', storageZone: 'pantry', quantity: 1 });
  });

  it.each([[429, 429], [502, 502], [504, 504]])('maps upstream status %s safely', async (upstreamStatus, expected) => {
    const url = await start({ analyze: vi.fn().mockRejectedValue(Object.assign(new Error('upstream secret'), { status: upstreamStatus })) });
    const response = await fetch(url, { method: 'POST', headers: { Origin: origin, 'content-type': 'application/json' }, body: validBody() });
    expect(response.status).toBe(expected);
    expect(await response.text()).not.toContain('upstream secret');
  });
});
