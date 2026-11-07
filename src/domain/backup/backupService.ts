import type { DexieInventoryRepository } from '../../db/inventoryRepository';
import { validateBackup, type BackupV1 } from './schema';

export class BackupService {
  constructor(private readonly repository: DexieInventoryRepository) {}
  async exportBackup(): Promise<BackupV1> {
    const [items, events, stored] = await Promise.all([this.repository.db.inventory.toArray(), this.repository.db.events.toArray(), this.repository.db.settings.get('local')]);
    return { format: 'kitchen-manager-backup', version: 1, exportedAt: new Date().toISOString(), items, events, settings: stored ?? { timezone: 'Asia/Shanghai', storageVersion: 1 } };
  }
  async restoreBackup(value: unknown) {
    const backup = validateBackup(value);
    const db = this.repository.db;
    await db.transaction('rw', db.inventory, db.events, db.settings, async () => {
      await db.inventory.clear(); await db.events.clear(); await db.settings.clear();
      await db.inventory.bulkAdd(backup.items); await db.events.bulkAdd(backup.events);
      await db.settings.add({ id: 'local', ...backup.settings, lastBackupAt: backup.exportedAt });
    });
  }
}
