import type { CartItem, PaymentMethod } from '@/lib/pos-cart';

export type ProductVariant = {
  id: string;
  sku: string;
  barcode?: string | null;
  size?: string | null;
  color?: string | null;
  price: string | number;
  promoPrice?: string | number | null;
  stock: string | number;
  product: { id: string; name: string; photoPath?: string | null; location: string; category?: { id: string; name: string } | null };
};

export type ProductGroup = { id: string; name: string; photoPath?: string | null; category?: { id: string; name: string } | null; variants: ProductVariant[] };
export type Category = { id: string; name: string };

export function groupProducts(rows: ProductVariant[]): ProductGroup[] {
  const groups = new Map<string, ProductGroup>();
  for (const variant of rows) {
    const existing = groups.get(variant.product.id);
    if (existing) existing.variants.push(variant);
    else groups.set(variant.product.id, { id: variant.product.id, name: variant.product.name, photoPath: variant.product.photoPath, category: variant.product.category, variants: [variant] });
  }
  return [...groups.values()];
}

export function toCartItem(variant: ProductVariant): CartItem & { name: string; sku: string; size?: string | null; color?: string | null } {
  return { id: variant.id, stock: Number(variant.stock), price: variant.price, promoPrice: variant.promoPrice, quantity: 1, name: variant.product.name, sku: variant.sku, size: variant.size, color: variant.color };
}

export function paymentLabel(method: PaymentMethod) {
  return { CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia' }[method];
}

export function checkoutError(status: number, body: { error?: unknown }) {
  return status === 409 ? 'El stock cambió. Revisa el carrito y vuelve a intentarlo.' : typeof body.error === 'string' ? body.error : 'No fue posible registrar la venta.';
}
