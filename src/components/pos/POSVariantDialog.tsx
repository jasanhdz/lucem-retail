'use client';

import { Check, Copy, Minus, Plus, ShoppingCart } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { effectivePrice } from '@/lib/pos-cart';
import type { ProductGroup, ProductVariant } from './pos-utils';

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const colorSwatch = (color: string) => {
  const normalized = color.toLowerCase();
  if (normalized.includes('negro')) return '#102b2a';
  if (normalized.includes('blanco')) return '#fff';
  if (normalized.includes('azul') || normalized.includes('índigo')) return '#183f46';
  if (normalized.includes('gris')) return '#bec5c3';
  if (normalized.includes('rojo')) return '#ba1a1a';
  if (normalized.includes('olivo') || normalized.includes('verde')) return '#87917b';
  if (normalized.includes('rosa')) return '#d895a8';
  return '#d1e7e1';
};

export function POSVariantDialog({ product, onClose, onSelect }: { product: ProductGroup; onClose: () => void; onSelect: (variant: ProductVariant, quantity: number) => void }) {
  const availableVariants = product.variants.filter((variant) => Number(variant.stock) > 0);
  const allColors = [...new Set(product.variants.map((variant) => variant.color).filter((color): color is string => Boolean(color)))];
  const [selectedColor, setSelectedColor] = useState<string | null>(() => {
    const firstAvailable = availableVariants[0] ?? product.variants[0];
    return firstAvailable?.color ?? null;
  });
  const colorVariants = product.variants.filter((variant) => (variant.color ?? null) === selectedColor);
  const sizeVariants = colorVariants.length ? colorVariants : product.variants;
  const [selectedSize, setSelectedSize] = useState<string | null>(() => {
    const firstAvailable = availableVariants[0] ?? product.variants[0];
    return firstAvailable?.size ?? (product.variants.length > 1 && !firstAvailable?.size ? firstAvailable?.sku : null) ?? null;
  });
  const showSkuOptions = sizeVariants.length > 1 && sizeVariants.every((variant) => !variant.size);
  const selectedVariant = (showSkuOptions
    ? sizeVariants.find((variant) => variant.sku === selectedSize)
    : sizeVariants.find((variant) => (variant.size ?? null) === selectedSize)) ?? sizeVariants[0] ?? product.variants[0];
  const [quantity, setQuantity] = useState(1);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const addToTicketRef = useRef<() => void>(() => undefined);
  const available = Math.floor(Math.max(0, Number(selectedVariant?.stock ?? 0)));
  const availableRef = useRef(available);
  availableRef.current = available;
  const unitPrice = selectedVariant ? effectivePrice({ ...selectedVariant, stock: available, quantity: 1 }) : 0;
  const subtotal = unitPrice * quantity;
  const colorTotals = useMemo(() => allColors.map((color) => ({
    color,
    stock: product.variants.filter((variant) => variant.color === color).reduce((sum, variant) => sum + Math.max(0, Number(variant.stock)), 0),
  })), [allColors, product.variants]);
  const sizes = showSkuOptions ? sizeVariants.map((variant) => variant.sku) : [...new Set(sizeVariants.map((variant) => variant.size ?? 'Única'))];

  onCloseRef.current = onClose;
  useLayoutEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key === 'F2') {
        event.preventDefault();
        setQuantity((current) => Math.min(availableRef.current, current + 1));
      } else if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        addToTicketRef.current();
      } else if (event.key === 'Tab' && dialog.current) {
        const focusable = [...dialog.current.querySelectorAll<HTMLElement>('button:not([disabled])')];
        if (focusable.length && event.shiftKey && document.activeElement === focusable[0]) {
          event.preventDefault();
          focusable.at(-1)?.focus();
        } else if (focusable.length && !event.shiftKey && document.activeElement === focusable.at(-1)) {
          event.preventDefault();
          focusable[0].focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function chooseColor(color: string) {
    setSelectedColor(color);
    const colorChoices = product.variants.filter((variant) => variant.color === color);
    const next = colorChoices.find((variant) => Number(variant.stock) > 0) ?? colorChoices[0];
    setSelectedSize(next?.size ?? null);
    setQuantity(1);
  }
  function chooseSize(size: string) {
    setSelectedSize(showSkuOptions ? size : size === 'Única' ? null : size);
    setQuantity(1);
  }
  function addToTicket() {
    if (selectedVariant && available > 0 && quantity > 0) onSelect(selectedVariant, quantity);
  }
  addToTicketRef.current = addToTicket;

  return (
    <div className="pos-variant-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialog} className="pos-variant-dialog" role="dialog" aria-modal="true" aria-labelledby="pos-variant-title">
        <h1 id="pos-variant-title" className="sr-only">Seleccionar variante de {product.name}</h1>
        <div className="pos-variant-content">
          {allColors.length > 0 && (
            <section className="pos-variant-section" aria-labelledby="pos-color-heading">
              <div className="pos-variant-section-heading"><h2 id="pos-color-heading">1. COLOR SELECCIONADO:</h2><strong>{selectedColor}</strong></div>
              <div className="pos-color-options" role="group" aria-label="Seleccionar color">
                {colorTotals.map(({ color, stock }) => {
                  const active = selectedColor === color;
                  return <button key={color} type="button" className={`pos-color-option ${active ? 'is-selected' : ''}`} aria-pressed={active} onClick={() => chooseColor(color)}>
                    <span className={`pos-color-swatch ${color.toLowerCase().includes('blanco') ? 'is-light' : ''}`} style={{ backgroundColor: colorSwatch(color) }}>{active && <Check size={15} aria-hidden="true" />}</span>
                    <span><strong>{color}</strong><small>{stock} en total</small></span>
                  </button>;
                })}
              </div>
            </section>
          )}

          <section className="pos-variant-section" aria-labelledby="pos-size-heading">
            <div className="pos-variant-section-heading"><h2 id="pos-size-heading">{allColors.length > 0 ? '2. TALLA DE PRENDA:' : 'PRESENTACIÓN DISPONIBLE:'}</h2><span>Presione para alternar</span></div>
            <div className="pos-size-options" role="group" aria-label={allColors.length > 0 ? 'Seleccionar talla' : 'Seleccionar presentación'}>
              {sizes.map((size) => {
                const variant = showSkuOptions
                  ? sizeVariants.find((item) => item.sku === size)
                  : sizeVariants.find((item) => (item.size ?? 'Única') === size);
                const stock = Math.max(0, Number(variant?.stock ?? 0));
                const active = showSkuOptions ? selectedVariant?.id === variant?.id : (selectedSize ?? 'Única') === size;
                return <button key={size} type="button" className={`pos-size-option ${active ? 'is-selected' : ''} ${stock <= 0 ? 'is-unavailable' : ''}`} aria-label={`${size}, ${stock} disponibles, SKU ${variant?.sku ?? ''}`} aria-pressed={active} disabled={stock <= 0} onClick={() => chooseSize(size)}>
                  <strong>{showSkuOptions ? `Variante ${size}` : size}</strong>
                  {stock > 0 ? <small>{stock} disponibles</small> : <small className="pos-size-empty">AGOTADO 0 DISP.</small>}
                </button>;
              })}
            </div>
          </section>

          {selectedVariant && <section className="pos-variant-summary" aria-label="Variante seleccionada">
            <div><span>SKU DE VARIANTE ESPECÍFICA</span><strong className="pos-variant-selected-sku">{selectedVariant.sku}<Copy size={14} aria-hidden="true" /></strong></div>
            <div><span>DISPONIBILIDAD EN MOSTRADOR</span><strong><i aria-hidden="true" />{available} unidades en sucursal</strong></div>
            <div><span>PRECIO UNITARIO</span><strong>{currency.format(unitPrice)} MXN</strong></div>
          </section>}

          {selectedVariant && <section className="pos-variant-quantity" aria-label="Cantidad y subtotal">
            <div className="pos-variant-quantity-label"><strong>Cantidad requerida</strong><span>Toque [+] o teclee F2</span></div>
            <div className="pos-variant-stepper" aria-label="Cantidad">
              <button type="button" aria-label="Disminuir cantidad" disabled={quantity <= 1} onClick={() => setQuantity((current) => Math.max(1, current - 1))}><Minus size={18} aria-hidden="true" /></button>
              <output aria-live="polite">{quantity}</output>
              <button type="button" aria-label="Aumentar cantidad" disabled={quantity >= available} onClick={() => setQuantity((current) => Math.min(available, current + 1))}><Plus size={18} aria-hidden="true" /></button>
            </div>
            <div className="pos-variant-subtotal"><span>SUBTOTAL VARIANTE</span><strong>{currency.format(subtotal)} MXN</strong></div>
          </section>}
        </div>

        <footer className="pos-variant-footer">
          <button ref={cancelRef} autoFocus className="pos-variant-cancel" type="button" aria-label="Cerrar variantes" onClick={onClose}>Cancelar selección (ESC)</button>
          <button className="pos-variant-add" type="button" disabled={!selectedVariant || available <= 0} onClick={addToTicket}><ShoppingCart size={18} aria-hidden="true" />Agregar al carrito ({currency.format(subtotal)} MXN)<kbd>ENTER</kbd></button>
        </footer>
      </section>
    </div>
  );
}
