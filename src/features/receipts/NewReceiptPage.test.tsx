import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ReceiptFlow } from './NewReceiptPage';

const processed = { mimeType: 'image/jpeg' as const, base64: 'abc', width: 100, height: 200, byteLength: 3 };
const draft = { receiptDate: '2026-11-08', merchantName: null, warnings: [], items: [{ name: '鸡蛋', category: 'protein' as const, storageZone: 'fridge' as const, quantity: 8, unit: '个', confidence: 'high' as const }] };

describe('ReceiptFlow', () => {
  it('offers a camera-compatible file input and privacy notice', () => {
    render(<ReceiptFlow today="2026-11-08" processImage={vi.fn()} analyzeReceipt={vi.fn()} saveItems={vi.fn()} onSaved={vi.fn()} />, { wrapper: MemoryRouter });
    const input = screen.getByLabelText('拍摄或选择小票');
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
    expect(input).toHaveAttribute('capture', 'environment');
    expect(screen.getByText(/发送至火山方舟/)).toBeInTheDocument();
  });

  it('previews, recognizes once on double click, then saves only after confirmation', async () => {
    const user = userEvent.setup();
    const processImage = vi.fn().mockResolvedValue(processed);
    const analyzeReceipt = vi.fn().mockResolvedValue(draft);
    const saveItems = vi.fn().mockResolvedValue(undefined);
    const onSaved = vi.fn();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const view = render(<ReceiptFlow today="2026-11-08" processImage={processImage} analyzeReceipt={analyzeReceipt} saveItems={saveItems} onSaved={onSaved} />, { wrapper: MemoryRouter });
    await user.upload(screen.getByLabelText('拍摄或选择小票'), new File([new Uint8Array([0xff, 0xd8, 0xff])], 'a.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByAltText('小票预览')).toHaveAttribute('src', 'blob:preview');
    expect(saveItems).not.toHaveBeenCalled();
    await user.dblClick(screen.getByRole('button', { name: '开始识别' }));
    expect(await screen.findByDisplayValue('鸡蛋')).toBeInTheDocument();
    expect(analyzeReceipt).toHaveBeenCalledTimes(1);
    expect(saveItems).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '全部加入库存' }));
    await vi.waitFor(() => expect(saveItems).toHaveBeenCalledTimes(1));
    expect(onSaved).toHaveBeenCalled();
    view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    createObjectURL.mockRestore(); revokeObjectURL.mockRestore();
  });

  it('shows retryable errors and does not write inventory', async () => {
    const user = userEvent.setup();
    const saveItems = vi.fn();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    render(<ReceiptFlow today="2026-11-08" processImage={vi.fn().mockRejectedValue(new Error('图片处理失败'))} analyzeReceipt={vi.fn()} saveItems={saveItems} onSaved={vi.fn()} />, { wrapper: MemoryRouter });
    await user.upload(screen.getByLabelText('拍摄或选择小票'), new File([new Uint8Array([0xff, 0xd8, 0xff])], 'a.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByText('图片处理失败')).toBeInTheDocument();
    expect(saveItems).not.toHaveBeenCalled();
    expect(screen.queryByAltText('小票预览')).not.toBeInTheDocument();
  });

  it('ignores an older image task that finishes after the latest selection', async () => {
    const user = userEvent.setup();
    let finishA!: (value: typeof processed) => void;
    let finishB!: (value: typeof processed) => void;
    const processImage = vi.fn()
      .mockReturnValueOnce(new Promise((resolve) => { finishA = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { finishB = resolve; }));
    const analyzeReceipt = vi.fn().mockResolvedValue(draft);
    vi.spyOn(URL, 'createObjectURL').mockImplementation((file) => `blob:${(file as File).name}`);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    render(<ReceiptFlow today="2026-11-08" processImage={processImage} analyzeReceipt={analyzeReceipt} saveItems={vi.fn()} onSaved={vi.fn()} />, { wrapper: MemoryRouter });
    const input = screen.getByLabelText('拍摄或选择小票');
    await user.upload(input, new File(['a'], 'a.jpg', { type: 'image/jpeg' }));
    await user.upload(input, new File(['b'], 'b.jpg', { type: 'image/jpeg' }));
    finishB({ ...processed, base64: 'b' });
    expect(await screen.findByAltText('小票预览')).toHaveAttribute('src', 'blob:b.jpg');
    finishA({ ...processed, base64: 'a' });
    await user.click(await screen.findByRole('button', { name: '开始识别' }));
    expect(analyzeReceipt).toHaveBeenCalledWith(expect.objectContaining({ base64: 'b' }), '2026-11-08', expect.any(AbortSignal));
  });

  it('does not create a preview after unmount while compression is pending', async () => {
    let finish!: (value: typeof processed) => void;
    const processImage = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const createObjectURL = vi.spyOn(URL, 'createObjectURL');
    const view = render(<ReceiptFlow today="2026-11-08" processImage={processImage} analyzeReceipt={vi.fn()} saveItems={vi.fn()} onSaved={vi.fn()} />, { wrapper: MemoryRouter });
    await userEvent.upload(screen.getByLabelText('拍摄或选择小票'), new File(['a'], 'a.jpg', { type: 'image/jpeg' }));
    view.unmount();
    finish(processed);
    await Promise.resolve();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('still finishes image processing under React StrictMode effect replay', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:strict');
    render(<StrictMode><MemoryRouter><ReceiptFlow today="2026-11-08" processImage={vi.fn().mockResolvedValue(processed)} analyzeReceipt={vi.fn()} saveItems={vi.fn()} onSaved={vi.fn()} /></MemoryRouter></StrictMode>);
    await userEvent.upload(screen.getByLabelText('拍摄或选择小票'), new File(['a'], 'a.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByRole('button', { name: '开始识别' })).toBeEnabled();
    expect(screen.getByAltText('小票预览')).toHaveAttribute('src', 'blob:strict');
  });
});
