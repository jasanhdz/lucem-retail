'use client';

import { Barcode, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Category, ProductGroup, ProductVariant } from './pos-utils';
import { groupProducts } from './pos-utils';
import { POSProductCard } from './POSProductCard';

export function POSCatalog({ onVariant }: { onVariant: (variant: ProductVariant, product: ProductGroup) => void }) {
  const [rows, setRows] = useState<ProductVariant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      const response = await fetch(`/api/products?${params}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'No se pudo cargar el catálogo.');
      setRows(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar el catálogo.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [query]);
  useEffect(() => {
    void fetch('/api/categories').then((response) => response.json()).then(setCategories).catch(() => undefined);
  }, []);
  useEffect(() => {
    const initialSearch = new URLSearchParams(window.location.search).get('search');
    if (initialSearch) setQuery(initialSearch);
  }, []);
  useEffect(() => {
    const refresh = () => void load();
    const syncSearch = (event: Event) => {
      const value = (event as CustomEvent<string>).detail;
      if (typeof value === 'string') setQuery(value);
    };
    window.addEventListener('pos-refresh-catalog', refresh);
    window.addEventListener('pos:search', syncSearch);
    return () => {
      window.removeEventListener('pos-refresh-catalog', refresh);
      window.removeEventListener('pos:search', syncSearch);
    };
  }, [query]);

  const products = groupProducts(rows);
  const visibleProducts = categoryId ? products.filter((product) => product.category?.id === categoryId) : products;
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((product) => {
      const id = product.category?.id;
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    return counts;
  }, [products]);

  return (
    <section className="pos-catalog" aria-labelledby="pos-catalog-title">
      <h1 id="pos-catalog-title" className="sr-only">Nueva venta</h1>
      <div className="pos-toolbar">
        <label className="pos-search">
          <Search size={20} aria-hidden="true" />
          <span className="sr-only">Buscar productos</span>
          <input ref={searchRef} aria-label="Buscar productos" value={query} onChange={(event) => { setQuery(event.target.value); window.dispatchEvent(new CustomEvent('operation-search-sync', { detail: event.target.value })); }} placeholder="Buscar por nombre, SKU o código de barras… (F3)" />
          <span className="pos-scanner-ready"><i aria-hidden="true" />Escáner listo</span>
          <kbd>F3</kbd>
        </label>
        <button className="pos-scanner-button" type="button" aria-label="Escanear código (Lector / USB)" onClick={() => searchRef.current?.focus()}>
          <Barcode size={20} aria-hidden="true" />
          <span>Escanear código (Lector / USB)</span>
        </button>
      </div>

      <div className="pos-category-chips" role="group" aria-label="Categorías de productos">
        <button type="button" className={!categoryId ? 'is-active' : ''} aria-pressed={!categoryId} onClick={() => setCategoryId('')}>
          Todos <span>{products.length}</span>
        </button>
        {categories.map((category) => (
          <button key={category.id} type="button" className={categoryId === category.id ? 'is-active' : ''} aria-pressed={categoryId === category.id} onClick={() => setCategoryId(category.id)}>
            {category.name} <span>{categoryCounts.get(category.id) ?? 0}</span>
          </button>
        ))}
      </div>

      {error ? (
        <div className="pos-alert" role="alert">{error}<button type="button" onClick={() => void load()}>Reintentar</button></div>
      ) : loading ? (
        <div className="pos-empty" role="status">Cargando catálogo…</div>
      ) : visibleProducts.length === 0 ? (
        <div className="pos-empty"><h2>Sin productos disponibles</h2><p>Prueba otra búsqueda o categoría.</p></div>
      ) : (
        <div className="pos-product-grid">
          {visibleProducts.map((product) => <POSProductCard key={product.id} product={product} onSelect={() => onVariant(product.variants[0], product)} />)}
        </div>
      )}

    </section>
  );
}
