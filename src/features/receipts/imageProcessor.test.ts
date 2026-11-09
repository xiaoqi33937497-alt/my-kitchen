import { describe, expect, it, vi } from 'vitest';
import { processReceiptImage, ReceiptImageError, type ImageProcessorTools } from './imageProcessor';

function file(bytes: number[], type: string, sizePadding = 0) {
  return new File([new Uint8Array(bytes), new Uint8Array(sizePadding)], 'receipt', { type });
}

const jpeg = [0xff, 0xd8, 0xff, 0xdb];

function tools(overrides: Partial<ImageProcessorTools> = {}): ImageProcessorTools {
  return {
    decode: vi.fn().mockResolvedValue({ width: 3000, height: 2000, source: {} }),
    encodeJpeg: vi.fn().mockResolvedValue(new Blob([new Uint8Array(1000)], { type: 'image/jpeg' })),
    dispose: vi.fn(),
    ...overrides,
  };
}

describe('processReceiptImage', () => {
  it('accepts real JPEG bytes and bounds longest edge to 2200px', async () => {
    const adapter = tools();
    const result = await processReceiptImage(file(jpeg, 'image/jpeg'), adapter);
    expect(adapter.encodeJpeg).toHaveBeenCalledWith({}, 2200, 1467, 0.82);
    expect(result).toMatchObject({ mimeType: 'image/jpeg', width: 2200, height: 1467, byteLength: 1000 });
    expect(adapter.dispose).toHaveBeenCalled();
  });

  it('rejects HEIC and forged MIME before decoding', async () => {
    const adapter = tools();
    await expect(processReceiptImage(file([0, 1, 2, 3], 'image/jpeg'), adapter)).rejects.toThrow(ReceiptImageError);
    await expect(processReceiptImage(file([0, 1, 2, 3], 'image/heic'), adapter)).rejects.toThrow('仅支持');
    expect(adapter.decode).not.toHaveBeenCalled();
  });

  it('rejects source files over 10 MB and unsafe decoded dimensions', async () => {
    await expect(processReceiptImage(file(jpeg, 'image/jpeg', 10 * 1024 * 1024), tools())).rejects.toThrow('10 MB');
    await expect(processReceiptImage(file(jpeg, 'image/jpeg'), tools({ decode: vi.fn().mockResolvedValue({ width: 12000, height: 10, source: {} }) }))).rejects.toThrow('尺寸');
    await expect(processReceiptImage(file(jpeg, 'image/jpeg'), tools({ decode: vi.fn().mockResolvedValue({ width: 8000, height: 8000, source: {} }) }))).rejects.toThrow('像素');
  });

  it('iteratively reduces quality and size until output is at most 4 MiB', async () => {
    const sizes = [5_000_000, 4_800_000, 4_500_000, 4_300_000, 3_000_000];
    const adapter = tools({ encodeJpeg: vi.fn().mockImplementation(() => Promise.resolve(new Blob([new Uint8Array(sizes.shift()!)]))) });
    const result = await processReceiptImage(file(jpeg, 'image/jpeg'), adapter);
    expect(result.byteLength).toBe(3_000_000);
    expect(adapter.encodeJpeg).toHaveBeenCalledTimes(5);
  });

  it('disposes decoded resources when encoding fails', async () => {
    const adapter = tools({ encodeJpeg: vi.fn().mockRejectedValue(new Error('canvas failed')) });
    await expect(processReceiptImage(file(jpeg, 'image/jpeg'), adapter)).rejects.toThrow('处理图片失败');
    expect(adapter.dispose).toHaveBeenCalled();
  });
});
