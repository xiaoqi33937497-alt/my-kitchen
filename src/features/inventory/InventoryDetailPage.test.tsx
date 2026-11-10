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

  it('shows only actual-item nutrition totals and money in inventory detail', () => {
    render(<InventoryDetailView item={{ id: 'snack', name: '零食', category: 'snack', storageZone: 'pantry', purchasedAt: '2026-11-10', initialQuantity: 1, remainingQuantity: 1, unit: '件', weightGrams: 15, lineAmountCents: 350, receiptTotalCents: 1200, nutrition: { source: 'label', weightGrams: 15, totals: { caloriesKcal: 75, proteinGrams: 1.5, fatGrams: 3, carbohydrateGrams: 9, sodiumMilligrams: 120 }, per100g: { caloriesKcal: 500, proteinGrams: 10, fatGrams: 20, carbohydrateGrams: 60, sodiumMilligrams: 800 } }, dateSource: 'none', status: 'active', createdAt: '', updatedAt: '' }} onConsume={() => undefined} onDiscard={() => undefined} />, { wrapper: MemoryRouter });
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('¥3.50')).toBeInTheDocument();
    expect(screen.queryByText('小票实付总额')).not.toBeInTheDocument();
    expect(screen.queryByText('¥12.00')).not.toBeInTheDocument();
    expect(screen.queryByText('500')).not.toBeInTheDocument();
  });
});

