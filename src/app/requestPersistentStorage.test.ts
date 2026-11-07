import { describe, expect, it, vi } from 'vitest';
import { requestPersistentStorage } from './requestPersistentStorage';

describe('requestPersistentStorage', () => {
  it('reports when durable storage is granted', async () => {
    expect(await requestPersistentStorage({ persist: vi.fn().mockResolvedValue(true) })).toBe('granted');
  });
  it('continues when permission is denied', async () => {
    expect(await requestPersistentStorage({ persist: vi.fn().mockResolvedValue(false) })).toBe('denied');
  });
  it('continues when the API is missing or throws', async () => {
    expect(await requestPersistentStorage(undefined)).toBe('unsupported');
    expect(await requestPersistentStorage({ persist: vi.fn().mockRejectedValue(new Error('blocked')) })).toBe('error');
  });
});
