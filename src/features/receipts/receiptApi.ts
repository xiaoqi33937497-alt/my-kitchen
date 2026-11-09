import { z } from 'zod';
import type { ProcessedReceiptImage, ReceiptApiDraft } from './contracts';

const category = z.enum(['vegetable', 'fruit', 'protein', 'drink', 'snack', 'staple', 'other']);
const storageZone = z.enum(['fridge', 'freezer', 'pantry']);
const receiptDraftSchema = z.object({
  receiptDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  merchantName: z.string().max(80).nullable(),
  items: z.array(z.object({ name: z.string().trim().min(1).max(100), category, storageZone, quantity: z.number().positive(), unit: z.string().trim().min(1).max(20), packageExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), confidence: z.enum(['high', 'medium', 'low']) })).max(80),
  warnings: z.array(z.string().max(200)).max(20),
});

export class ReceiptApiError extends Error {}

const messages: Record<number, string> = {
  400: '小票图片内容无效，请重新选择', 403: '当前网页不允许使用识别服务', 413: '小票图片太大，请裁剪后重试', 429: '识别请求太频繁，请稍后重试', 502: '识别服务暂时不可用，请稍后重试', 504: '识别超时，请重试',
};

export class ReceiptApi {
  private readonly endpoint: string;
  constructor(baseUrl: string, private readonly fetchImpl: typeof fetch = fetch) {
    if (!baseUrl) throw new ReceiptApiError('小票识别服务尚未配置');
    const url = new URL(baseUrl);
    const loopback = url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname);
    if (url.protocol !== 'https:' && !loopback) throw new ReceiptApiError('小票识别服务必须使用 HTTPS');
    this.endpoint = `${url.toString().replace(/\/$/, '')}/v1/receipts/analyze`;
  }

  async analyzeReceipt(image: ProcessedReceiptImage, clientDate: string, signal?: AbortSignal): Promise<ReceiptApiDraft> {
    let response: Response;
    try {
      response = await this.fetchImpl.call(globalThis, this.endpoint, { method: 'POST', signal, credentials: 'omit', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image: { mimeType: image.mimeType, base64: image.base64 }, clientDate }) });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ReceiptApiError('网络连接失败，请检查网络后重试');
    }
    if (!response.ok) throw new ReceiptApiError(messages[response.status] ?? '识别失败，请稍后重试');
    try { return receiptDraftSchema.parse(await response.json()); }
    catch { throw new ReceiptApiError('识别结果格式异常，请重试'); }
  }
}
