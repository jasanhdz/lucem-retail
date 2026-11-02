import { describe, expect, it } from 'vitest';
import { addToCart, cartTotal, cartUnits, changeCartQuantity, checkoutRequest, cashChange } from '../src/lib/pos-cart';

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
  it('builds a variant-only request and omits received amount for non-cash', () => {
    const cart = [{ id: 'variant-1', stock: 3, price: '20.00', quantity: 2 }];
    expect(checkoutRequest(cart, 'CARD', null, 'attempt-1')).toEqual({ items: [{ variantId: 'variant-1', quantity: 2 }], paymentMethod: 'CARD', idempotencyKey: 'attempt-1' });
    expect(checkoutRequest(cart, 'CASH', 50, 'attempt-1')).toEqual({ items: [{ variantId: 'variant-1', quantity: 2 }], paymentMethod: 'CASH', receivedAmount: 50, idempotencyKey: 'attempt-1' });
  });
  it('calculates cash change without producing a negative value', () => {
    expect(cashChange(75, 100)).toBe(25);
    expect(cashChange(75, 50)).toBe(0);
  });
});
