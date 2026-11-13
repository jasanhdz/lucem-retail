'use client';

import { Plus, SlidersHorizontal } from 'lucide-react';
import { effectivePrice } from '@/lib/pos-cart';
import type { ProductGroup } from './pos-utils';

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export function POSProductCard({ product, onSelect }: { product: ProductGroup; onSelect: () => void }) {
  const first = product.variants[0];
  const unavailable = product.variants.every((variant) => Number(variant.stock) <= 0);
  const available = product.variants.reduce((sum, variant) => sum + Number(variant.stock), 0);
  const hasVariants = product.variants.length > 1;
  const price = effectivePrice({ ...first, stock: Number(first.stock), quantity: 1 });
  const hasPromotion = first.promoPrice != null && Number(first.promoPrice) < Number(first.price);

  return (
    <article className={`pos-product-card ${unavailable ? 'is-unavailable' : ''}`}>
      <button type="button" className="pos-product-trigger" onClick={onSelect} disabled={unavailable}>
        <span className="sr-only">Ver producto</span>
        <span className="pos-product-image-frame">
          {product.photoPath ? <img src={product.photoPath} alt="" className="pos-product-image" /> : <span className="pos-product-image pos-product-placeholder" aria-hidden="true">{product.name.slice(0, 1).toUpperCase()}</span>}
          <span className={`pos-stock-badge ${unavailable ? 'is-empty' : ''}`}>{unavailable ? 'Agotado (0 disp.)' : `${available} disp.`}</span>
          {hasVariants && <span className="pos-variant-badge">Variantes</span>}
          {hasPromotion && <span className="pos-promo-badge">-{Math.round((1 - Number(first.promoPrice) / Number(first.price)) * 100)}% PROMO</span>}
        </span>
        <span className="pos-product-info">
          <span className="pos-product-sku">{first.sku}</span>
          <strong title={product.name}>{product.name}</strong>
        </span>
      </button>
      <div className="pos-product-footer">
        <span className="pos-product-price-label">{hasVariants ? 'Desde' : 'Precio'}</span>
        <div className="pos-product-price-row">
          <span className="pos-product-price">
            {hasPromotion && <del>{currency.format(Number(first.price))}</del>}
            <strong>{currency.format(price)}</strong><small>MXN</small>
          </span>
          <button type="button" className={hasVariants ? 'pos-variant-trigger' : 'pos-add-trigger'} onClick={onSelect} disabled={unavailable} aria-label={`Agregar ${product.name}`} title={hasVariants ? 'Elegir variantes' : 'Agregar al ticket'}>
            {hasVariants ? <SlidersHorizontal size={18} aria-hidden="true" /> : <><Plus size={16} aria-hidden="true" /><span>Agregar</span></>}
          </button>
        </div>
      </div>
    </article>
  );
}
