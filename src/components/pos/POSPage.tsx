'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { POSCatalog } from './POSCatalog';
import { POSCart } from './POSCart';
import { POSVariantDialog } from './POSVariantDialog';
import type { POSLine, ProductGroup, ProductVariant } from './pos-utils';
import { toCartItem } from './pos-utils';

const CART_DRAFT_KEY = 'lucem-pos-cart-draft';

export function POSPage() {
  const router = useRouter();
  const [cart, setCart] = useState<POSLine[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [selected, setSelected] = useState<ProductGroup | null>(null);
  const variantTrigger = useRef<HTMLButtonElement | null>(null);
  const checkoutRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CART_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCart(parsed as POSLine[]);
      }
    } catch {
      window.localStorage.removeItem(CART_DRAFT_KEY);
    } finally {
      setCartReady(true);
    }
  }, []);

  useEffect(() => {
    if (!cartReady) return;
    if (cart.length) window.localStorage.setItem(CART_DRAFT_KEY, JSON.stringify(cart));
    else window.localStorage.removeItem(CART_DRAFT_KEY);
  }, [cart, cartReady]);

  function choose(variant: ProductVariant, product: ProductGroup, requestedQuantity = 1) {
    if (product.variants.length > 1 && !selected) {
      variantTrigger.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
      setSelected(product);
      return;
    }
    const item = toCartItem(variant);
    setCart((current) => {
      const existing = current.find((line) => line.id === item.id);
      const quantity = Math.min(Number(item.stock), Math.max(1, requestedQuantity));
      if (existing) return current.map((line) => line.id === item.id ? { ...line, quantity: Math.min(Number(line.stock), line.quantity + quantity) } : line);
      return Number(item.stock) > 0 ? [...current, { ...item, quantity }] as POSLine[] : current;
    });
    setSelected(null);
  }

  function openCheckout() {
    if (!cart.length) return;
    window.localStorage.setItem(CART_DRAFT_KEY, JSON.stringify(cart));
    router.push('/pos/cobro');
  }
  checkoutRef.current = openCheckout;

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === 'F1') {
        event.preventDefault();
        window.dispatchEvent(new Event('pos:new-sale'));
        setCart([]);
      } else if (event.key === 'F3') {
        event.preventDefault();
        window.dispatchEvent(new Event('pos:focus-search'));
      } else if (event.key === 'F4') {
        event.preventDefault();
        checkoutRef.current();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  return (
    <div className="pos-page">
      <POSCatalog onVariant={choose} />
      <POSCart cart={cart} setCart={setCart} onCheckout={openCheckout} />
      {selected && <POSVariantDialog product={selected} returnFocusRef={variantTrigger} onClose={() => setSelected(null)} onSelect={(variant, quantity) => choose(variant, selected, quantity)} />}
    </div>
  );
}
