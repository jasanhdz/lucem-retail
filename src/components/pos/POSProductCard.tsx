'use client';
import { effectivePrice } from '@/lib/pos-cart';
import type { ProductGroup } from './pos-utils';

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
export function POSProductCard({ product, onSelect }: { product: ProductGroup; onSelect: () => void }) {
  const first = product.variants[0];
  const unavailable = product.variants.every((variant) => Number(variant.stock) <= 0);
  const available = product.variants.reduce((sum, variant) => sum + Number(variant.stock), 0);
  return <article className="pos-product-card"><button type="button" className="pos-product-trigger" onClick={onSelect} disabled={unavailable} aria-label={`Agregar ${product.name}`}>
    {product.photoPath ? <img src={product.photoPath} alt="" className="pos-product-image" /> : <div className="pos-product-image pos-product-placeholder" aria-hidden="true">{product.name.slice(0, 1).toUpperCase()}</div>}
    <span className="pos-product-info"><span className={`pos-stock-badge ${unavailable ? 'is-empty' : ''}`}>{unavailable ? 'Agotado' : `${available} disp.`}</span><strong>{product.name}</strong><small>{product.category?.name ?? 'Sin categoría'} · {product.variants.length} {product.variants.length === 1 ? 'variante' : 'variantes'}</small><b>{currency.format(effectivePrice({ ...first, stock: Number(first.stock), quantity: 1 }))}</b></span>
  </button></article>;
}
