import { describe, expect, it } from 'vitest';
import { addToCart, cartTotal, cartUnits, changeCartQuantity } from '../src/lib/pos-cart';

describe('POS cart mechanics', () => {
  it('uses promotional price and computes amount and units', () => {
    const cart = [{ id: 'a', stock: 4, price: 100, promoPrice: 75, quantity: 2 }];
    expect(cartTotal(cart)).toBe(150);
    expect(cartUnits(cart)).toBe(2);
  });
  it('increments only to known stock and removes an item at zero', () => {
    const item = { id: 'a', stock: 2, price: 10, quantity: 1 };
    expect(addToCart([item], item)[0].quantity).toBe(2);
    expect(addToCart([item], item)[0].quantity).toBeLessThanOrEqual(item.stock);
    expect(changeCartQuantity([item], 'a', -1)).toEqual([]);
  });
});
