import type { ProcessedReceiptImage } from './contracts';

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const MAX_PIXELS = 36_000_000;
const MAX_SIDE = 10_000;
const MAX_ASPECT = 20;

export class ReceiptImageError extends Error {}

export interface DecodedImage {
  width: number;
  height: number;
  source: CanvasImageSource;
}

export interface ImageProcessorTools {
  decode(file: File): Promise<DecodedImage>;
  encodeJpeg(source: CanvasImageSource, width: number, height: number, quality: number): Promise<Blob>;
  dispose(decoded: DecodedImage): void;
}

function detectMime(bytes: Uint8Array) {
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

const browserTools: ImageProcessorTools = {
  async decode(file) {
    const source = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { width: source.width, height: source.height, source };
  },
  async encodeJpeg(source, width, height, quality) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 不可用');
    context.drawImage(source, 0, 0, width, height);
    return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('图片编码失败')), 'image/jpeg', quality));
  },
  dispose(decoded) { if ('close' in decoded.source && typeof decoded.source.close === 'function') decoded.source.close(); },
};

function toBase64(bytes: Uint8Array) {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  return btoa(binary);
}

export async function processReceiptImage(file: File, tools: ImageProcessorTools = browserTools): Promise<ProcessedReceiptImage> {
  if (file.size > MAX_SOURCE_BYTES) throw new ReceiptImageError('图片不能超过 10 MB');
  const expectedMime = detectMime(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  if (!expectedMime || expectedMime !== file.type || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new ReceiptImageError('仅支持真实的 JPEG、PNG 或 WebP 图片');
  let decoded: DecodedImage | undefined;
  try {
    decoded = await tools.decode(file);
    const { width, height } = decoded;
    if (width < 15 || height < 15 || width > MAX_SIDE || height > MAX_SIDE || Math.max(width / height, height / width) > MAX_ASPECT) throw new ReceiptImageError('图片尺寸不符合要求');
    if (width * height > MAX_PIXELS) throw new ReceiptImageError('图片像素过大');
    const initialScale = Math.min(1, 2200 / Math.max(width, height));
    let targetWidth = Math.max(1, Math.round(width * initialScale));
    let targetHeight = Math.max(1, Math.round(height * initialScale));
    const qualities = [0.82, 0.72, 0.62, 0.52];
    let output: Blob | undefined;
    for (let round = 0; round < 3 && (!output || output.size > MAX_OUTPUT_BYTES); round += 1) {
      for (const quality of qualities) {
        output = await tools.encodeJpeg(decoded.source, targetWidth, targetHeight, quality);
        if (output.size <= MAX_OUTPUT_BYTES) break;
      }
      if (output && output.size > MAX_OUTPUT_BYTES) { targetWidth = Math.round(targetWidth * 0.85); targetHeight = Math.round(targetHeight * 0.85); }
    }
    if (!output || output.size > MAX_OUTPUT_BYTES) throw new ReceiptImageError('压缩后的图片仍然太大，请裁剪后重试');
    const bytes = new Uint8Array(await output.arrayBuffer());
    return { mimeType: 'image/jpeg', base64: toBase64(bytes), width: targetWidth, height: targetHeight, byteLength: bytes.byteLength };
  } catch (error) {
    if (error instanceof ReceiptImageError) throw error;
    throw new ReceiptImageError('处理图片失败，请换一张图片重试');
  } finally { if (decoded) tools.dispose(decoded); }
}
