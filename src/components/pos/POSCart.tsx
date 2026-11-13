'use client';

import { Calculator, Keyboard, Trash2, X } from 'lucide-react';
import { cartTotal, cartUnits, changeCartQuantity, effectivePrice } from '@/lib/pos-cart';
import type { POSLine } from './pos-utils';

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export function POSCart({ cart, setCart, onCheckout }: { cart: POSLine[]; setCart: (cart: POSLine[]) => void; onCheckout: () => void }) {
  const total = cartTotal(cart);
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const discount = Math.max(0, subtotal - total);

  return (
    <aside className="pos-cart pos-cart-desktop" aria-label="Carrito de venta">
      <header className="pos-cart-heading">
        <div className="pos-cart-title-wrap">
          <span className="pos-cart-count">{cartUnits(cart)}</span>
          <div><h2>Ticket actual</h2><span>Ticket en curso</span></div>
        </div>
        <button className="pos-clear" type="button" onClick={() => setCart([])} disabled={!cart.length}>
          <Trash2 size={15} aria-hidden="true" /><span>Limpiar</span>
        </button>
      </header>

      {cart.length === 0 ? (
        <div className="pos-cart-empty">Agrega productos para comenzar.</div>
      ) : (
        <div className="pos-cart-lines" aria-label="Productos en el ticket">
          {cart.map((line) => {
            const unitPrice = effectivePrice(line);
            const variantDetails = [line.size && `Talla ${line.size}`, line.color].filter(Boolean);
            return (
              <article className="pos-cart-line" key={line.id}>
                <div className="pos-cart-line-heading">
                  <div className="pos-cart-line-title">
                    <strong>{line.name}</strong>
                    {line.promoPrice != null && <span className="pos-cart-promo">PROMO</span>}
                  </div>
                  <button type="button" aria-label={`Eliminar ${line.name} del ticket`} onClick={() => setCart(cart.filter((item) => item.id !== line.id))}>
                    <X size={17} aria-hidden="true" />
                  </button>
                </div>
                <div className="pos-cart-line-meta">
                  {variantDetails.map((value) => <span key={value}>{value}</span>)}
                  <small>SKU: {line.sku}</small>
                </div>
                <div className="pos-cart-line-bottom">
                  <div className="pos-stepper">
                    <button type="button" aria-label={`Disminuir ${line.name}`} onClick={() => setCart(changeCartQuantity(cart, line.id, -1) as POSLine[])}>−</button>
                    <span>{line.quantity}</span>
                    <button type="button" aria-label={`Aumentar ${line.name}`} onClick={() => setCart(changeCartQuantity(cart, line.id, 1) as POSLine[])}>+</button>
                  </div>
                  <div className="pos-cart-line-prices">
                    <small>{line.quantity} × {currency.format(unitPrice)}</small>
                    <strong>{currency.format(unitPrice * line.quantity)} MXN</strong>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="pos-total">
        <div className="pos-total-row"><span>Subtotal ({cartUnits(cart)} {cartUnits(cart) === 1 ? 'artículo' : 'artículos'})</span><strong>{currency.format(subtotal)} MXN</strong></div>
        {discount > 0 && <div className="pos-total-row pos-discount-row"><span>Descuento promocional aplicado</span><strong>−{currency.format(discount)} MXN</strong></div>}
        <div className="pos-total-divider" />
        <div className="pos-total-payable"><span>Total a pagar</span><strong>{currency.format(total)}<small>MXN</small></strong></div>
      </div>

      <button className="pos-charge-trigger" type="button" onClick={onCheckout} disabled={!cart.length}>
        <span><Calculator size={19} aria-hidden="true" />Cobrar</span><strong>{currency.format(total)}<kbd>F4</kbd></strong>
      </button>

      <div className="pos-shortcuts" aria-label="Atajos de teclado">
        <span className="pos-shortcuts-title"><Keyboard size={15} aria-hidden="true" />Atajos de teclado</span>
        <span><kbd>F1</kbd>Nueva</span><span><kbd>F3</kbd>Buscar</span><span><kbd>F4</kbd>Cobro</span>
      </div>
    </aside>
  );
}
