import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { createKitchenDb } from './kitchenDb';
import { DexieInventoryRepository } from './inventoryRepository';

const dbNames: string[] = [];
function makeRepository() {
  const name = `kitchen-test-${crypto.randomUUID()}`;
  dbNames.push(name);
  const db = createKitchenDb(name);
  return { db, repository: new DexieInventoryRepository(db) };
}

afterEach(async () => {
  await Promise.all(dbNames.splice(0).map(async (name) => {
    const db = createKitchenDb(name);
    await db.delete();
  }));
});

describe('DexieInventoryRepository', () => {
  it('creates, reads, updates and orders active inventory by newest purchase first', async () => {
    const { repository } = makeRepository();
    await repository.create({ id: 'old', name: '菠菜', category: 'vegetable', storageZone: 'fridge', purchasedAt: '2026-11-05', initialQuantity: 1, remainingQuantity: 1, unit: '把' });
    await repository.create({ id: 'new', name: '鸡蛋', category: 'protein', storageZone: 'fridge', purchasedAt: '2026-11-07', initialQuantity: 6, remainingQuantity: 6, unit: '个' });

    await repository.update('old', { remainingQuantity: 0, status: 'consumed' });

    expect((await repository.get('old'))?.status).toBe('consumed');
    expect((await repository.listActive()).map((item) => item.id)).toEqual(['new']);
  });

  it('reopens the same database without duplicating inventory', async () => {
    const name = `kitchen-test-${crypto.randomUUID()}`;
    dbNames.push(name);
    const firstDb = createKitchenDb(name);
    const first = new DexieInventoryRepository(firstDb);
    await first.create({ id: 'milk', name: '鲜牛奶', category: 'drink', storageZone: 'fridge', purchasedAt: '2026-11-07', initialQuantity: 2, remainingQuantity: 2, unit: '盒' });
    firstDb.close();

    const reopened = new DexieInventoryRepository(createKitchenDb(name));

    expect((await reopened.listActive()).map((item) => item.id)).toEqual(['milk']);
  });
});
