import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { InventoryDetailView } from './InventoryDetailPage';

describe('InventoryDetailView', () => {
  it('labels estimated dates as references and exposes partial consumption', () => {
    render(<InventoryDetailView item={{ id: 'spinach', name: '菠菜', category: 'vegetable', storageZone: 'fridge', purchasedAt: '2026-11-05', initialQuantity: 2, remainingQuantity: 2, unit: '把', dateSource: 'estimate', bestBeforeDate: '2026-11-08', status: 'active', createdAt: '', updatedAt: '' }} onConsume={() => undefined} onDiscard={() => undefined} />, { wrapper: MemoryRouter });
    expect(screen.getByText('参考估算')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '记录已吃数量' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '编辑食材' })).toHaveAttribute('href', '/inventory/spinach/edit');
  });
});
