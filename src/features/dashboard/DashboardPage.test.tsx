import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DashboardView } from './DashboardPage';
import { DashboardPage } from './DashboardPage';
import { inventoryService } from '../../app/services';
import { vi } from 'vitest';

describe('DashboardView', () => {
  it('shows priority items, zone totals and future feature labels', () => {
    render(<DashboardView data={{ total: 2, zoneTotals: { fridge: 2, freezer: 0, pantry: 0 }, priority: [
      { item: { id: 'spinach', name: '菠菜', category: 'vegetable', storageZone: 'fridge', purchasedAt: '2026-11-05', initialQuantity: 1, remainingQuantity: 1, unit: '把', status: 'active', dateSource: 'estimate', createdAt: '', updatedAt: '' }, shelf: { bestBeforeDate: '2026-11-08', expiryDate: '2026-11-10', source: 'estimate', isReference: true }, urgency: 'today' },
    ] }} />, { wrapper: MemoryRouter });
    expect(screen.getByText('菠菜')).toBeInTheDocument();
    expect(screen.getByText('今天最佳')).toBeInTheDocument();
    expect(screen.getByText('参考估算')).toBeInTheDocument();
    expect(screen.getByText('冷藏')).toBeInTheDocument();
    expect(screen.getAllByText('下一阶段')).toHaveLength(2);
  });

  it('refreshes urgency when the app becomes visible again', async () => {
    const spy = vi.spyOn(inventoryService, 'getDashboard').mockResolvedValue({ total: 0, zoneTotals: { fridge: 0, freezer: 0, pantry: 0 }, priority: [] });
    render(<DashboardPage />, { wrapper: MemoryRouter });
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    spy.mockRestore();
  });

  it('links an empty kitchen to manual entry', () => {
    render(<DashboardView data={{ total: 0, zoneTotals: { fridge: 0, freezer: 0, pantry: 0 }, priority: [] }} />, { wrapper: MemoryRouter });
    expect(screen.getByRole('link', { name: '手动添加' })).toHaveAttribute('href', '/inventory/new');
  });
});
