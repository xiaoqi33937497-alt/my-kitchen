import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InventoryForm } from './InventoryForm';

describe('InventoryForm', () => {
  it('offers dairy and dessert categories', () => {
    render(<InventoryForm onSubmit={vi.fn()} today="2026-11-07" />);
    const category = screen.getByLabelText('分类');
    expect(category).toHaveTextContent('乳制品');
    expect(category).toHaveTextContent('甜品');
  });

  it('requires a name and positive quantity before submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<InventoryForm onSubmit={onSubmit} today="2026-11-07" />);
    await user.clear(screen.getByLabelText('数量'));
    await user.type(screen.getByLabelText('数量'), '0');
    await user.click(screen.getByRole('button', { name: '保存到库存' }));
    expect(screen.getByText('请输入食材名称')).toBeInTheDocument();
    expect(screen.getByText('数量必须大于 0')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the default fridge location and purchase date', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<InventoryForm onSubmit={onSubmit} today="2026-11-07" />);
    await user.type(screen.getByLabelText('食材名称'), '鸡蛋');
    await user.click(screen.getByRole('button', { name: '保存到库存' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: '鸡蛋', quantity: 1, storageZone: 'fridge', purchasedAt: '2026-11-07' }));
  });

  it('accepts a production date plus shelf-life duration', async () => {
    const user = userEvent.setup(); const onSubmit = vi.fn();
    render(<InventoryForm onSubmit={onSubmit} today="2026-11-07" />);
    await user.type(screen.getByLabelText('食材名称'), '酸奶');
    await user.type(screen.getByLabelText('生产日期'), '2026-11-01');
    await user.type(screen.getByLabelText('保质期（天）'), '14');
    await user.click(screen.getByRole('button', { name: '保存到库存' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ productionDate: '2026-11-01', shelfLifeDays: 14 }));
  });

  it('accepts actual weight, item amount, and five actual-item nutrition values', async () => {
    const user = userEvent.setup(); const onSubmit = vi.fn();
    render(<InventoryForm onSubmit={onSubmit} today="2026-11-07" />);
    await user.type(screen.getByLabelText('食材名称'), '牛奶蛋糕');
    await user.type(screen.getByLabelText('实际克数'), '15');
    await user.type(screen.getByLabelText('商品金额'), '3.5');
    await user.type(screen.getByLabelText('热量'), '75');
    await user.type(screen.getByLabelText('蛋白质'), '1.5');
    await user.type(screen.getByLabelText('脂肪'), '3');
    await user.type(screen.getByLabelText('碳水'), '9');
    await user.type(screen.getByLabelText('钠'), '120');
    await user.click(screen.getByRole('button', { name: '保存到库存' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ weightGrams: 15, lineAmountCents: 350, caloriesKcal: 75, proteinGrams: 1.5, fatGrams: 3, carbohydrateGrams: 9, sodiumMilligrams: 120 }));
  });

  it('shows existing actual-item nutrition values while editing', () => {
    render(<InventoryForm onSubmit={vi.fn()} today="2026-11-07" initial={{ weightGrams: 15, lineAmountCents: 350, caloriesKcal: 75, proteinGrams: 1.5, fatGrams: 3, carbohydrateGrams: 9, sodiumMilligrams: 120 }} />);
    expect(screen.getByLabelText('实际克数')).toHaveValue(15);
    expect(screen.getByLabelText('商品金额')).toHaveValue(3.5);
    expect(screen.getByLabelText('热量')).toHaveValue(75);
    expect(screen.getByLabelText('钠')).toHaveValue(120);
  });
});

