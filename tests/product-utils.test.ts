import { describe, expect, it } from 'vitest';
import { groupProductRows, validateProductDraft } from '@/components/products/product-utils';

const row = (id: string, sku: string, stock: string, threshold = '2') => ({
  businessId: 'b', productId: id, sku, cost: '10', price: '20', stock, lowStockThreshold: threshold,
  product: { id, name: 'Playera', location: 'A-1', category: { id: 'c', name: 'Ropa' } },
});

describe('product presentation helpers', () => {
  it('groups repeated API rows and calculates aggregate stock state', () => {
    const [product] = groupProductRows([row('p', 'A', '1'), row('p', 'B', '0')]);
    expect(product.variants).toHaveLength(2);
    expect(product.stock).toBe(1);
    expect(product.state).toBe('low');
  });

  it('rejects duplicate SKUs and negative numeric values locally', () => {
    const errors = validateProductDraft('Producto', 'c', [
      { sku: 'same', cost: '1', price: '2', stock: '-1', lowStockThreshold: '1' },
      { sku: ' SAME ', cost: '1', price: '2', stock: '0', lowStockThreshold: '1' },
    ]);
    expect(errors).toEqual(expect.arrayContaining(['Variante 2: el SKU está repetido en este formulario.', 'Variante 1: stock debe ser un número no negativo.']));
  });
});
