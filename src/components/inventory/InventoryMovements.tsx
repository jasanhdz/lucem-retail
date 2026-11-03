"use client";

import { CircleAlert, ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { useEffect, useState } from "react";

type Movement = {
  id: string;
  type: string;
  quantity: string;
  reason?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt: string;
  user: { name: string };
  variant: { sku: string; size?: string | null; color?: string | null; product: { name: string } };
};

const labels: Record<string, string> = {
  INITIAL: "Inicial", PURCHASE: "Compra", ADJUSTMENT_IN: "Ajuste positivo", ADJUSTMENT_OUT: "Ajuste negativo",
  RESERVATION: "Apartado", RELEASE: "Liberación", SALE: "Venta", SALE_CANCEL: "Cancelación", RETURN: "Devolución", CORRECTION: "Corrección",
};

export function InventoryMovements({ variantId }: { variantId?: string }) {
  const [items, setItems] = useState<Movement[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (variantId) params.set("variantId", variantId);
    if (query) params.set("q", query);
    if (type) params.set("type", type);
    try {
      const response = await fetch(`/api/inventory/movements?${params}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setItems(body.items);
      setTotalPages(body.totalPages || 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudieron cargar los movimientos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [page, query, type, variantId]);
  useEffect(() => {
    const syncSearch = (event: Event) => {
      const value = (event as CustomEvent<string>).detail;
      if (typeof value === 'string') {
        setPage(1);
        setQuery(value);
      }
    };
    window.addEventListener('inventory-movements:search', syncSearch);
    return () => window.removeEventListener('inventory-movements:search', syncSearch);
  }, []);

  return (
    <section className="inventory-page" aria-labelledby="movements-title">
      <header className="inventory-heading"><div><span className="inventory-eyebrow">Kardex</span><h1 id="movements-title">Movimientos</h1><p>Entradas, ajustes y operaciones que modificaron las existencias.</p></div></header>
      <div className="inventory-toolbar"><label className="inventory-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Buscar movimientos</span><input aria-label="Buscar movimientos" placeholder="Buscar producto, SKU o motivo" value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); window.dispatchEvent(new CustomEvent('operation-search-sync', { detail: event.target.value })); }} /></label><select aria-label="Filtrar por tipo" value={type} onChange={(event) => { setPage(1); setType(event.target.value); }}><option value="">Todos los tipos</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      {error && <div className="inventory-alert" role="alert"><CircleAlert size={18} /> {error}<button type="button" onClick={() => void load()}><RefreshCw size={16} /> Reintentar</button></div>}
      {loading ? <p className="inventory-loading" role="status">Cargando movimientos...</p> : items.length === 0 ? <div className="inventory-empty"><h2>Sin movimientos</h2><p>No hay registros para estos filtros.</p></div> : <div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>Fecha</th><th>Producto / variante</th><th>Tipo</th><th>Cantidad</th><th>Motivo</th><th>Referencia</th><th>Usuario</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</td><td><strong>{item.variant.product.name}</strong><span>{item.variant.sku}</span></td><td><span className={`inventory-type inventory-type-${item.quantity.startsWith("-") ? "negative" : "positive"}`}>{labels[item.type] ?? item.type}</span></td><td className={item.quantity.startsWith("-") ? "inventory-negative" : "inventory-positive"}>{Number(item.quantity) > 0 ? "+" : ""}{item.quantity}</td><td>{item.reason || "Sin motivo"}</td><td>{item.referenceType ? `${item.referenceType}${item.referenceId ? ` · ${item.referenceId}` : ""}` : "Sin referencia"}</td><td>{item.user.name}</td></tr>)}</tbody></table></div>}
      {totalPages > 1 && <nav className="inventory-pagination" aria-label="Paginación de movimientos"><button className="button button-quiet" type="button" aria-label="Página anterior" disabled={page === 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={17} /> Anterior</button><span>Página {page} de {totalPages}</span><button className="button button-quiet" type="button" aria-label="Página siguiente" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Siguiente <ChevronRight size={17} /></button></nav>}
    </section>
  );
}
