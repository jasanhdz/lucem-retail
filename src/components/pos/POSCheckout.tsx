'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, BookOpen, CheckCircle2, CreditCard, Landmark, Package, Shirt, ShoppingBag, XCircle } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { cashChange, cartTotal, cartUnits, checkoutRequest, type PaymentMethod } from '@/lib/pos-cart';
import type { POSLine } from './pos-utils';
import { checkoutError } from './pos-utils';

const CART_DRAFT_KEY = 'lucem-pos-cart-draft';
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const money = (amount: number) => currency.format(amount);

function validCart(value: unknown): value is POSLine[] {
  return Array.isArray(value) && value.length > 0 && value.every((line) =>
    line && typeof line.id === 'string' && typeof line.name === 'string' && typeof line.sku === 'string' &&
    Number.isFinite(Number(line.stock)) && Number(line.quantity) > 0 && Number.isFinite(Number(line.price)),
  );
}

function lineIcon(name: string) {
  const normalized = name.toLowerCase();
  if (/playera|blusa|sudadera|camisa|pantalón|falda|ropa|bota|calzado|tenis/.test(normalized)) return Shirt;
  if (/cuaderno|libro|papel/.test(normalized)) return BookOpen;
  if (/bolsa|cartera|mochila/.test(normalized)) return ShoppingBag;
  return Package;
}

export function POSCheckout() {
  const router = useRouter();
  const [cart, setCart] = useState<POSLine[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [received, setReceived] = useState('');
  const [printTicket, setPrintTicket] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const payloadSignature = useRef('');

  useEffect(() => {
    try {
      const serialized = window.localStorage.getItem(CART_DRAFT_KEY);
      const saved = serialized ? JSON.parse(serialized) : null;
      if (!validCart(saved)) {
        router.replace('/pos');
        return;
      }
      setCart(saved);
      setReceived(String(cartTotal(saved)));
    } catch {
      router.replace('/pos');
    } finally {
      setCartLoaded(true);
    }
  }, [router]);

  const total = cartTotal(cart);
  const subtotal = cart.reduce((sum, line) => sum + Number(line.price) * line.quantity, 0);
  const discount = Math.max(0, subtotal - total);
  const units = cartUnits(cart);
  const nextBill = Math.ceil(total / 100) * 100 || 100;
  const change = method === 'CASH' && Number(received) >= total ? cashChange(total, Number(received)) : 0;
  const insufficient = method === 'CASH' && (!received || !Number.isFinite(Number(received)) || Number(received) < total);
  const methods = useMemo(() => [
    { value: 'CASH' as const, label: 'Efectivo', Icon: Banknote },
    { value: 'CARD' as const, label: 'Tarjeta', Icon: CreditCard },
    { value: 'TRANSFER' as const, label: 'Transferencia', Icon: Landmark },
  ], []);

  async function confirmSale() {
    if (submitting || !cart.length || insufficient) return;
    const payload = checkoutRequest(cart, method, method === 'CASH' ? Number(received) : null, 'pending');
    const signature = JSON.stringify(payload);
    if (signature !== payloadSignature.current) {
      idempotencyKey.current = crypto.randomUUID();
      payloadSignature.current = signature;
    }
    const body = checkoutRequest(cart, method, method === 'CASH' ? Number(received) : null, idempotencyKey.current ?? crypto.randomUUID());
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (response.status === 201) {
        window.localStorage.removeItem(CART_DRAFT_KEY);
        if (printTicket) window.sessionStorage.setItem('pos-print-ticket', '1');
        else window.sessionStorage.removeItem('pos-print-ticket');
        router.push(`/tickets/${result.id}`);
        return;
      }
      setError(checkoutError(response.status, result));
      if (response.status === 409) window.dispatchEvent(new Event('pos-refresh-catalog'));
    } catch {
      setError('No se confirmó la venta. Verifica la conexión antes de reintentarlo.');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        router.push('/pos');
      } else if (event.key === 'F5') {
        event.preventDefault();
        setMethod('CASH');
      } else if (event.key === 'F6') {
        event.preventDefault();
        setMethod('CARD');
      } else if (event.key === 'F7') {
        event.preventDefault();
        setMethod('TRANSFER');
      } else if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        void confirmSale();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [cart, method, received, insufficient, submitting, printTicket, router]);

  if (!cartLoaded || !cart.length) return <main className="pos-payment-loading" role="status">Cargando cobro…</main>;

  return (
    <main className="pos-payment-page">
      <header className="pos-payment-heading">
        <Breadcrumbs items={[{ label: 'Regresar al carrito (Esc)', href: '/pos' }, { label: 'Cobro de Venta' }]} />
        <small>Folio: se asignará al confirmar</small>
      </header>

      <div className="pos-payment-layout">
        <section className="pos-payment-order" aria-labelledby="pos-payment-order-title">
          <header className="pos-payment-order-heading">
            <div><span>ORDEN ACTIVA</span><h2 id="pos-payment-order-title">Resumen de venta</h2></div>
            <strong>{cart.length} productos · {units} {units === 1 ? 'pieza' : 'pzas'}</strong>
          </header>
          <div className="pos-payment-order-lines">
            {cart.map((line) => {
              const Icon = lineIcon(line.name);
              const unitPrice = Number(line.promoPrice ?? line.price);
              return <article className="pos-payment-order-line" key={line.id}>
                <span className="pos-payment-line-icon"><Icon size={19} aria-hidden="true" /></span>
                <div className="pos-payment-line-info">
                  <strong>{line.name}{line.promoPrice != null && <em>PROMO</em>}</strong>
                  <span><b>{line.quantity}x</b>{[line.size && `Talla ${line.size}`, line.color].filter(Boolean).join(' · ') || line.sku}</span>
                </div>
                <div className="pos-payment-line-total">{line.promoPrice != null && <del>{money(Number(line.price) * line.quantity)}</del>}<strong>{money(unitPrice * line.quantity)}</strong><small>{money(unitPrice)} /u</small></div>
              </article>;
            })}
          </div>
          <div className="pos-payment-order-total"><span>TOTAL A LIQUIDAR</span><strong>{money(total)}<small>MXN</small></strong></div>
        </section>

        <section className="pos-payment-form" aria-labelledby="pos-payment-method-title">
          <div className="pos-payment-method-heading"><h2 id="pos-payment-method-title">SELECCIONE MÉTODO DE PAGO</h2><span>Teclas rápidas (F5 – F7)</span></div>
          <div className="pos-method-options" role="radiogroup" aria-label="Método de pago">
            {methods.map(({ value, label, Icon }) => <button key={value} type="button" role="radio" aria-checked={method === value} className={method === value ? 'is-selected' : ''} onClick={() => setMethod(value)}>
              <Icon size={20} aria-hidden="true" />{label}{method === value && <i aria-hidden="true" />}
            </button>)}
          </div>

          {method === 'CASH' && <div className="pos-cash-entry">
            <label htmlFor="pos-cash-received"><span>MONTO RECIBIDO ($ MXN)</span><small>Capture cantidad o elija billete</small></label>
            <div className="pos-cash-input"><span>$</span><input id="pos-cash-received" aria-label="Monto recibido" type="number" min="0" step="0.01" value={received} onChange={(event) => setReceived(event.target.value)} /><span>MXN</span></div>
            <span className="pos-cash-quick-label">BILLETES COMUNES Y MONTOS RÁPIDOS</span>
            <div className="pos-cash-quick-amounts">
              {[
                { label: 'Exacto', amount: total },
                { label: '+1 Billete', amount: nextBill },
                { label: 'Billetes', amount: 1500 },
                { label: 'Billetes', amount: 2000 },
              ].map(({ label, amount }, index) => <button key={`${label}-${amount}-${index}`} type="button" disabled={amount < total} onClick={() => setReceived(amount.toFixed(2))}><span>{label}</span><strong>{money(amount)}</strong></button>)}
            </div>
            <div className={`pos-cash-change ${insufficient ? 'is-insufficient' : ''}`}>
              <span className="pos-cash-change-icon"><Banknote size={20} aria-hidden="true" /></span>
              <div><strong>{insufficient ? 'EFECTIVO INSUFICIENTE' : 'CAMBIO A DEVOLVER AL CLIENTE'}</strong><small>{insufficient ? 'El monto recibido debe cubrir el total.' : 'Entregar en efectivo al comprador'}</small></div>
              <b>{money(change)}<small>MXN</small></b>
            </div>
          </div>}

          {error && <p className="pos-payment-error" role="alert">{error}</p>}
          <button className="pos-payment-confirm" type="button" disabled={submitting || insufficient} onClick={() => void confirmSale()}>
            <CheckCircle2 size={19} aria-hidden="true" />{submitting ? 'Confirmando venta…' : 'Confirmar venta (Enter)'}<kbd>↵ Enter</kbd>
          </button>
          <div className="pos-payment-options-footer">
            <button type="button" onClick={() => router.push('/pos')}><XCircle size={16} aria-hidden="true" />Cancelar operación</button>
            <label><input type="checkbox" checked={printTicket} onChange={(event) => setPrintTicket(event.target.checked)} />Imprimir ticket térmico</label>
          </div>
        </section>
      </div>
    </main>
  );
}
