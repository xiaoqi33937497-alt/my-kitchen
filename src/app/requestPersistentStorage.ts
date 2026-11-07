export interface StorageManagerLike { persist?: () => Promise<boolean> }
export async function requestPersistentStorage(storage: StorageManagerLike | undefined = navigator.storage): Promise<'granted' | 'denied' | 'unsupported' | 'error'> {
  if (!storage?.persist) return 'unsupported';
  try { return await storage.persist() ? 'granted' : 'denied'; } catch { return 'error'; }
}
