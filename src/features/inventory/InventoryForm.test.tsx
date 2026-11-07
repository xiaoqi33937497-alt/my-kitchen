import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InventoryForm } from './InventoryForm';

describe('InventoryForm', () => {
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
});
