import { afterEach, describe, expect, it } from 'vitest';
import { createKitchenDb } from '../../db/kitchenDb';
import { DexieInventoryRepository } from '../../db/inventoryRepository';
import { BackupService } from './backupService';

const names: string[] = [];
function setup() { const name = `backup-${crypto.randomUUID()}`; names.push(name); const repository = new DexieInventoryRepository(createKitchenDb(name)); return { repository, service: new BackupService(repository) }; }
afterEach(async () => { await Promise.all(names.splice(0).map((name) => createKitchenDb(name).delete())); });

describe('BackupService', () => {
  it('exports and restores a versioned snapshot', async () => {
    const { repository, service } = setup();
    await repository.create({ id: 'eggs', name: '鸡蛋', category: 'protein', storageZone: 'fridge', purchasedAt: '2026-11-07', initialQuantity: 6, remainingQuantity: 4, unit: '个' });
    const backup = await service.exportBackup();
    expect(backup).toMatchObject({ format: 'kitchen-manager-backup', version: 1 });
    await repository.replaceAll({ items: [], events: [] });
    await service.restoreBackup(backup);
    expect((await repository.listActive()).map((item) => item.id)).toEqual(['eggs']);
  });

  it('rejects invalid or duplicate records atomically', async () => {
    const { repository, service } = setup();
    await repository.create({ id: 'safe', name: '牛奶', category: 'drink', storageZone: 'fridge', purchasedAt: '2026-11-07', initialQuantity: 1, remainingQuantity: 1, unit: '盒' });
    const item = (await service.exportBackup()).items[0];
    await expect(service.restoreBackup({ format: 'kitchen-manager-backup', version: 1, exportedAt: new Date().toISOString(), items: [item, item], events: [], settings: { timezone: 'Asia/Shanghai', storageVersion: 1 } })).rejects.toThrow('重复');
    expect((await repository.listActive()).map((entry) => entry.id)).toEqual(['safe']);
    await expect(service.restoreBackup({ format: 'kitchen-manager-backup', version: 2 })).rejects.toThrow();
  });

  it('rejects invalid dates and inconsistent quantities without changing any table', async () => {
    const { repository, service } = setup();
    await repository.create({ id: 'safe', name: '牛奶', category: 'drink', storageZone: 'fridge', purchasedAt: '2026-11-07', initialQuantity: 1, remainingQuantity: 1, unit: '盒' });
    await repository.addEvent({ id: 'event-safe', inventoryItemId: 'safe', quantity: 1, reason: 'corrected', createdAt: new Date().toISOString() });
    const backup = await service.exportBackup();
    const corrupt = structuredClone(backup);
    corrupt.items[0].purchasedAt = 'not-a-date';
    corrupt.items[0].remainingQuantity = 2;
    await expect(service.restoreBackup(corrupt)).rejects.toThrow();
    expect((await service.exportBackup()).items.map((item) => item.id)).toEqual(['safe']);
    expect((await service.exportBackup()).events.map((event) => event.id)).toEqual(['event-safe']);
  });
});
