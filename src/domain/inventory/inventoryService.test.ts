import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { createKitchenDb } from '../../db/kitchenDb';
import { DexieInventoryRepository } from '../../db/inventoryRepository';
import { InventoryService } from './inventoryService';

const names: string[] = [];
function setup() {
  const name = `service-${crypto.randomUUID()}`; names.push(name);
  const repository = new DexieInventoryRepository(createKitchenDb(name));
  return { repository, service: new InventoryService(repository) };
}
afterEach(async () => { await Promise.all(names.splice(0).map((name) => createKitchenDb(name).delete())); });

describe('InventoryService', () => {
  it('keeps a partially consumed item active and closes it at zero', async () => {
    const { repository, service } = setup();
    await service.createItem({ id: 'eggs', name: '鸡蛋', category: 'protein', storageZone: 'fridge', purchasedAt: '2026-11-07', initialQuantity: 6, remainingQuantity: 6, unit: '个' });

    await service.consume('eggs', 2);
    expect(await repository.get('eggs')).toMatchObject({ remainingQuantity: 4, status: 'active' });

    await service.consume('eggs', 4);
    expect(await repository.get('eggs')).toMatchObject({ remainingQuantity: 0, status: 'consumed' });
  });

  it('rejects over-consumption without changing quantity', async () => {
    const { repository, service } = setup();
    await service.createItem({ id: 'eggs', name: '鸡蛋', category: 'protein', storageZone: 'fridge', purchasedAt: '2026-11-07', initialQuantity: 6, remainingQuantity: 6, unit: '个' });
    await expect(service.consume('eggs', 7)).rejects.toThrow('不能超过剩余数量');
    expect((await repository.get('eggs'))?.remainingQuantity).toBe(6);
  });

  it('consumes decimal quantities at hundredth precision without floating-point residue', async () => {
    const { repository, service } = setup();
    await service.createItem({ id: 'meat', name: '肉', category: 'protein', storageZone: 'freezer', purchasedAt: '2026-11-07', initialQuantity: 0.3, remainingQuantity: 0.3, unit: '千克' });
    await service.consume('meat', 0.1);
    await service.consume('meat', 0.2);
    expect(await repository.get('meat')).toMatchObject({ remainingQuantity: 0, status: 'consumed' });
  });

  it('sorts the dashboard from past to two-days and excludes later items', async () => {
    const { service } = setup();
    for (const [id, purchasedAt] of [['past', '2026-11-01'], ['today', '2026-11-04'], ['one', '2026-11-05'], ['two', '2026-11-06'], ['later', '2026-11-07']] as const) {
      await service.createItem({ id, name: '菠菜', category: 'vegetable', storageZone: 'fridge', purchasedAt, initialQuantity: 1, remainingQuantity: 1, unit: '把' });
    }
    expect((await service.getDashboard(new Date('2026-11-07T04:00:00Z'))).priority.map((entry) => entry.item.id)).toEqual(['past', 'today', 'one', 'two']);
  });
});
