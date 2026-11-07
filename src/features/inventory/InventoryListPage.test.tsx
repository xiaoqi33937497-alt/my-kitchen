import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { InventoryListView } from './InventoryListPage';

const item = (id: string, name: string, storageZone: 'fridge'|'freezer') => ({ id, name, category: 'protein' as const, storageZone, purchasedAt: '2026-11-07', initialQuantity: 1, remainingQuantity: 1, unit: '个', status: 'active' as const, dateSource: 'estimate' as const, bestBeforeDate: '2026-11-09', createdAt: '', updatedAt: '' });
describe('InventoryListView', () => {
  it('filters inventory by storage zone', async () => {
    const user = userEvent.setup();
    render(<InventoryListView items={[item('a','鸡蛋','fridge'), item('b','冻肉','freezer')]} now={new Date('2026-11-07T04:00:00Z')} />, { wrapper: MemoryRouter });
    await user.selectOptions(screen.getByLabelText('存放位置筛选'), 'freezer');
    expect(screen.getByText('冻肉')).toBeInTheDocument();
    expect(screen.queryByText('鸡蛋')).not.toBeInTheDocument();
    expect(screen.getByText(/期限正常/)).toBeInTheDocument();
  });
});
