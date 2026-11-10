import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReceiptReviewForm, toEditableDraft, toNewInventoryItems } from './ReceiptReviewForm';
import { editableReceiptSchema } from './receiptDraftSchema';

const apiDraft = { receiptDate: '2026-11-07', merchantName: '超市', warnings: [], items: [
  { name: '鸡蛋', category: 'protein' as const, storageZone: 'fridge' as const, quantity: 8, unit: '个', confidence: 'high' as const },
  { name: '牛奶', category: 'drink' as const, storageZone: 'fridge' as const, quantity: 1, unit: '盒', confidence: 'medium' as const },
] };

describe('ReceiptReviewForm', () => {
  it('offers dairy and dessert categories for recognized items', () => {
    render(<ReceiptReviewForm initial={toEditableDraft(apiDraft)} fallbackDate="2026-11-08" onSave={vi.fn()} />);
    expect(screen.getAllByLabelText('分类')[0]).toHaveTextContent('乳制品');
    expect(screen.getAllByLabelText('分类')[0]).toHaveTextContent('甜品');
  });

  it('adds draft IDs and converts confirmed rows to inventory IDs', () => {
    const draft = toEditableDraft(apiDraft, () => 'draft-id');
    const items = toNewInventoryItems(draft, '2026-11-08', (() => { let i = 0; return () => `inventory-${++i}`; })());
    expect(draft.items[0].draftId).toBe('draft-id');
    expect(items[0]).toMatchObject({ id: 'inventory-1', name: '鸡蛋', purchasedAt: '2026-11-07', initialQuantity: 8, remainingQuantity: 8 });
  });

  it('edits the receipt date and item fields, deletes a row and saves once', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ReceiptReviewForm initial={toEditableDraft(apiDraft)} fallbackDate="2026-11-08" onSave={onSave} />);
    await user.clear(screen.getByLabelText('购买日期'));
    await user.type(screen.getByLabelText('购买日期'), '2026-11-08');
    await user.clear(screen.getAllByLabelText('商品名称')[0]);
    await user.type(screen.getAllByLabelText('商品名称')[0], '土鸡蛋');
    await user.click(screen.getAllByRole('button', { name: '删除此项' })[1]);
    await user.dblClick(screen.getByRole('button', { name: '全部加入库存' }));
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({ receiptDate: '2026-11-08', items: [{ name: '土鸡蛋' }] });
  });

  it('keeps the draft visible when transactional save fails', async () => {
    const user = userEvent.setup();
    render(<ReceiptReviewForm initial={toEditableDraft(apiDraft)} fallbackDate="2026-11-08" onSave={vi.fn().mockRejectedValue(new Error('写入失败'))} />);
    await user.click(screen.getByRole('button', { name: '全部加入库存' }));
    expect(await screen.findByText('保存失败，所有商品均未写入，请修正后重试')).toBeInTheDocument();
    expect(screen.getByDisplayValue('鸡蛋')).toBeInTheDocument();
  });
});

it('rejects impossible dates and quantities beyond hundredth precision', () => {
  const editable = toEditableDraft(apiDraft, () => 'draft-1');
  expect(editableReceiptSchema.safeParse({ ...editable, receiptDate: '2026-99-99' }).success).toBe(false);
  expect(editableReceiptSchema.safeParse({ ...editable, items: [{ ...editable.items[0], quantity: 0.123, packageExpiryDate: '2026-02-30' }] }).success).toBe(false);
});
