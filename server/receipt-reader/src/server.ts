import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { callArk } from './arkClient.js';
import type { AnalyzeReceiptRequest } from './contracts.js';
import { normalizeReceipt, ReceiptParseError } from './normalizeReceipt.js';
import jpeg from 'jpeg-js';

const MAX_BODY_BYTES = 6 * 1024 * 1024;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_SIDE = 10_000;
const MAX_IMAGE_PIXELS = 5_000_000;
const MAX_IMAGE_ASPECT = 20;
const allowedMimes = new Set(['image/jpeg']);

export interface ServerDeps {
  env?: Record<string, string | undefined>;
  analyze?: (input: AnalyzeReceiptRequest) => Promise<unknown>;
}

class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }

function json(response: ServerResponse, status: number, body: unknown, origin?: string) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
  if (origin) response.setHeader('access-control-allow-origin', origin);
  response.end(JSON.stringify(body));
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, '请求体过大');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function detectedMime(buffer: Buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function jpegDimensions(buffer: Buffer) {
  if (buffer.length < 4 || buffer[buffer.length - 2] !== 0xff || buffer[buffer.length - 1] !== 0xd9) return null;
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x00 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue; }
    if (offset + 4 > buffer.length) return null;
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > buffer.length) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      if (length < 7) return null;
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    offset += 2 + length;
  }
  return null;
}

function validImageDimensions(buffer: Buffer, mimeType: string) {
  const dimensions = mimeType === 'image/jpeg' ? jpegDimensions(buffer) : null;
  if (!dimensions) return false;
  const { width, height } = dimensions;
  if (!(width >= 15 && height >= 15 && width <= MAX_IMAGE_SIDE && height <= MAX_IMAGE_SIDE
    && width * height <= MAX_IMAGE_PIXELS && Math.max(width / height, height / width) <= MAX_IMAGE_ASPECT)) return false;
  try {
    const decoded = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: false, maxResolutionInMP: 5, maxMemoryUsageInMB: 64 });
    return decoded.width === width && decoded.height === height;
  } catch { return false; }
}

function validateRequest(value: unknown): AnalyzeReceiptRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, '请求格式错误');
  const source = value as Record<string, unknown>;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(source.clientDate ?? ''))) throw new HttpError(400, '日期格式错误');
  if (!source.image || typeof source.image !== 'object' || Array.isArray(source.image)) throw new HttpError(400, '缺少图片');
  const image = source.image as Record<string, unknown>;
  const mimeType = String(image.mimeType ?? '');
  const base64 = String(image.base64 ?? '');
  if (!allowedMimes.has(mimeType)) throw new HttpError(415, '不支持的图片格式');
  if (!base64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw new HttpError(400, '图片编码错误');
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length > MAX_IMAGE_BYTES) throw new HttpError(413, '图片过大');
  if (detectedMime(bytes) !== mimeType) throw new HttpError(415, '图片格式与内容不匹配');
  if (!validImageDimensions(bytes, mimeType)) throw new HttpError(415, '图片内容损坏或尺寸不符合要求');
  return { image: { mimeType: mimeType as AnalyzeReceiptRequest['image']['mimeType'], base64 }, clientDate: String(source.clientDate) };
}

export function createServer(deps: ServerDeps = {}) {
  const env = deps.env ?? process.env;
  return http.createServer(async (request, response) => {
    const origin = request.headers.origin;
    const allowedOrigin = env.ALLOWED_ORIGIN;
    try {
      if (!allowedOrigin || !env.ARK_API_KEY || !env.ARK_MODEL_ID) throw new HttpError(500, '服务配置不完整');
      if (origin !== allowedOrigin) throw new HttpError(403, '来源不允许');
      if (request.url !== '/v1/receipts/analyze') throw new HttpError(404, '接口不存在');
      if (request.method === 'OPTIONS') {
        response.statusCode = 204;
        response.setHeader('access-control-allow-origin', allowedOrigin);
        response.setHeader('access-control-allow-methods', 'POST, OPTIONS');
        response.setHeader('access-control-allow-headers', 'content-type');
        response.setHeader('vary', 'Origin');
        response.end();
        return;
      }
      if (request.method !== 'POST') throw new HttpError(405, '请求方法不允许');
      if (!String(request.headers['content-type'] ?? '').startsWith('application/json')) throw new HttpError(415, '请求必须为 JSON');
      let body: unknown;
      try { body = JSON.parse(await readBody(request)); } catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'JSON 格式错误'); }
      const input = validateRequest(body);
      const analyze = deps.analyze ?? ((value: AnalyzeReceiptRequest) => callArk(value, { apiKey: env.ARK_API_KEY!, modelId: env.ARK_MODEL_ID! }));
      const draft = normalizeReceipt(await analyze(input), input.clientDate);
      json(response, 200, draft, allowedOrigin);
    } catch (error) {
      const status = error instanceof HttpError || (error && typeof error === 'object' && 'status' in error) ? Number((error as { status: number }).status) : error instanceof ReceiptParseError ? 502 : 502;
      const safeStatus = [400, 403, 404, 405, 413, 415, 429, 500, 502, 504].includes(status) ? status : 502;
      json(response, safeStatus, { error: safeStatus === 429 ? '识别请求过多，请稍后重试' : safeStatus === 504 ? '识别超时，请重试' : safeStatus >= 500 ? '识别服务暂时不可用' : (error instanceof Error ? error.message : '请求失败') }, origin === allowedOrigin ? allowedOrigin : undefined);
    }
  });
}

