import { describe, expect, it, vi } from 'vitest';
import { ReceiptApi, ReceiptApiError } from './receiptApi';
import type { ProcessedReceiptImage } from './contracts';

const image: ProcessedReceiptImage = { mimeType: 'image/jpeg', base64: 'abc', width: 100, height: 200, byteLength: 3 };
const draft = { receiptDate: '2026-11-08', merchantName: null, items: [{ name: '鸡蛋', category: 'protein', storageZone: 'fridge', quantity: 8, unit: '个', confidence: 'high' }], warnings: [] };

describe('ReceiptApi', () => {
  it('requires an HTTPS endpoint', () => {
    expect(() => new ReceiptApi('')).toThrow('尚未配置');
    expect(() => new ReceiptApi('http://example.com')).toThrow('HTTPS');
  });

  it('allows an HTTP loopback endpoint for local end-to-end tests only', () => {
    expect(() => new ReceiptApi('http://127.0.0.1:5173/mock')).not.toThrow();
    expect(() => new ReceiptApi('http://localhost:5173/mock')).not.toThrow();
  });

  it('posts the expected contract and validates the response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(draft), { status: 200, headers: { 'content-type': 'application/json' } }));
    const result = await new ReceiptApi('https://api.example.com/', fetchImpl).analyzeReceipt(image, '2026-11-08');
    expect(fetchImpl).toHaveBeenCalledWith('https://api.example.com/v1/receipts/analyze', expect.objectContaining({ method: 'POST', body: JSON.stringify({ image: { mimeType: 'image/jpeg', base64: 'abc' }, clientDate: '2026-11-08' }) }));
    expect(result.items[0].name).toBe('鸡蛋');
  });

  it('calls browser fetch with the global object as its receiver', async () => {
    const strictFetch = vi.fn(function (this: unknown) {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
      return Promise.resolve(new Response(JSON.stringify(draft), { status: 200 }));
    }) as unknown as typeof fetch;
    await expect(new ReceiptApi('https://api.example.com', strictFetch).analyzeReceipt(image, '2026-11-08')).resolves.toMatchObject({ receiptDate: '2026-11-08' });
  });

  it.each([[400, '小票图片'], [403, '不允许'], [413, '太大'], [429, '频繁'], [502, '暂时'], [504, '超时']])('maps status %s to a useful message', async (status, text) => {
    const api = new ReceiptApi('https://api.example.com', vi.fn().mockResolvedValue(new Response('{}', { status })));
    await expect(api.analyzeReceipt(image, '2026-11-08')).rejects.toThrow(text);
  });

  it('rejects malformed successful responses', async () => {
    const api = new ReceiptApi('https://api.example.com', vi.fn().mockResolvedValue(new Response('{"items":[{"name":""}]}', { status: 200 })));
    await expect(api.analyzeReceipt(image, '2026-11-08')).rejects.toBeInstanceOf(ReceiptApiError);
  });

  it('preserves AbortError for cancellation', async () => {
    const aborted = new DOMException('Aborted', 'AbortError');
    const api = new ReceiptApi('https://api.example.com', vi.fn().mockRejectedValue(aborted));
    await expect(api.analyzeReceipt(image, '2026-11-08')).rejects.toBe(aborted);
  });
});
