import { describe, expect, it } from 'vitest';
import { inventoryBalances } from '@/components/inventory/inventory-utils';

describe('inventory balances', () => {
  it('keeps available stock separate and derives physical stock', () => {
    expect(inventoryBalances('4.50', '2.25')).toEqual({ available: '4.5', reserved: '2.25', physical: '6.75' });
  });
});
