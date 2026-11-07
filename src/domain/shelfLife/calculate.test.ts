import { describe, expect, it } from 'vitest';
import { calculateShelfLife, getUrgency } from './calculate';

const base = { category: 'vegetable' as const, storageZone: 'fridge' as const, purchasedAt: '2026-11-05', name: '菠菜' };

describe('shelf-life calculations', () => {
  it('prefers a confirmed package expiry date', () => {
    expect(calculateShelfLife({ ...base, packageExpiryDate: '2026-11-20' }, new Date('2026-11-07T04:00:00Z'))).toEqual({ bestBeforeDate: '2026-11-20', expiryDate: '2026-11-20', source: 'package', isReference: false });
  });

  it('calculates package expiry from production date and duration', () => {
    expect(calculateShelfLife({ ...base, productionDate: '2026-11-01', shelfLifeDays: 10 }, new Date())).toMatchObject({ expiryDate: '2026-11-11', source: 'calculated-package', isReference: false });
  });

  it('estimates refrigerated spinach and changes when frozen', () => {
    expect(calculateShelfLife(base, new Date())).toMatchObject({ bestBeforeDate: '2026-11-08', expiryDate: '2026-11-10', source: 'estimate', isReference: true });
    expect(calculateShelfLife({ ...base, storageZone: 'freezer' }, new Date()).expiryDate).toBe('2027-02-03');
  });

  it('classifies urgency using the Asia/Shanghai calendar date around midnight', () => {
    const result = { bestBeforeDate: '2026-11-09', expiryDate: '2026-11-10', source: 'estimate' as const, isReference: true };
    expect(getUrgency(result, new Date('2026-11-07T15:59:59Z'))).toBe('two-days');
    expect(getUrgency(result, new Date('2026-11-07T16:00:01Z'))).toBe('one-day');
  });
});
