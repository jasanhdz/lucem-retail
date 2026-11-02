"use client";

import { CircleAlert, Eye, Package, Plus, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { InventoryMutationDialog } from "./InventoryMutationDialog";

export type InventoryRow = { id: string; sku: string; size?: string | null; color?: string | null; stock: string; available: string; reserved: string; physical: string; lowStockThreshold: string; product: { id: string; name: string; location: string; category?: { name: string } | null } };
type Role = "ADMIN" | "INVENTORY_MANAGER" | "SELLER";
const read = async (response: Response) => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || `La solicitud terminó con ${response.status}.`); return body; };

export function InventoryPage({ role }: { role: Role }) {
  const [rows, setRows] = useState<InventoryRow[]>([]); const [query, setQuery] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [dialog, setDialog] = useState(false); const triggerRef = useRef<HTMLButtonElement>(null);
  const canMutate = role !== "SELLER";
  async function load() { setLoading(true); setError(""); try { setRows(await read(await fetch("/api/inventory"))); } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo cargar el inventario."); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  const filtered = rows.filter((row) => `${row.product.name} ${row.sku} ${row.product.location}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="inventory-page" aria-labelledby="inventory-title"><header className="inventory-heading"><div><span className="inventory-eyebrow">Control de existencias</span><h1 id="inventory-title">Inventario</h1><p>Disponibilidad real por variante, con apartados activos separados.</p></div><div className="inventory-heading-actions"><Link className="button button-quiet" href="/inventario/movimientos">Ver movimientos</Link>{canMutate && <button ref={triggerRef} className="button inventory-primary" type="button" onClick={() => setDialog(true)}><Plus size={18} /> Registrar movimiento</button>}</div></header>
    <div className="inventory-summary"><div><span>Variantes</span><strong>{rows.length}</strong></div><div><span>Disponibles</span><strong>{rows.reduce((sum, row) => sum + Number(row.available), 0).toLocaleString("es-MX")}</strong></div><div><span>Apartados activos</span><strong>{rows.reduce((sum, row) => sum + Number(row.reserved), 0).toLocaleString("es-MX")}</strong></div></div>
    <div className="inventory-toolbar"><label className="inventory-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Buscar inventario</span><input aria-label="Buscar inventario" placeholder="Buscar por producto, SKU o ubicación" value={query} onChange={(event) => setQuery(event.target.value)} /></label><Link className="inventory-link" href="/productos">Administrar productos</Link></div>
    {error && <div className="inventory-alert" role="alert"><CircleAlert size={18} /> <span>{error}</span><button type="button" onClick={() => void load()}><RefreshCw size={16} /> Reintentar</button></div>}
     {loading ? <div className="inventory-loading" role="status">Cargando inventario...</div> : filtered.length === 0 ? <div className="inventory-empty"><Package size={40} /><h2>{rows.length ? "No hay coincidencias" : "No hay inventario"}</h2><p>{rows.length ? "Prueba con otra búsqueda." : "Las variantes activas aparecerán aquí."}</p></div> : <div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>Producto / variante</th><th>Ubicación</th><th>Estado</th><th>Físico</th><th>Apartado</th><th>Disponible</th><th /></tr></thead><tbody>{filtered.map((row) => { const state = Number(row.available) === 0 ? "Agotado" : Number(row.available) <= Number(row.lowStockThreshold) ? "Bajo" : "Disponible"; return <tr key={row.id}><td><strong>{row.product.name}</strong><span>{row.sku}{[row.size, row.color].filter(Boolean).join(" · ") && ` · ${[row.size, row.color].filter(Boolean).join(" · ")}`}</span></td><td>{row.product.location || "Sin ubicación"}</td><td><span className={`inventory-status inventory-status-${state.toLowerCase()}`}>{state}</span></td><td>{row.physical}</td><td>{row.reserved}</td><td><strong className={state !== "Disponible" ? "inventory-low" : ""}>{row.available}</strong></td><td><Link className="icon-link" href={`/inventario/${row.id}`} aria-label={`Ver detalle de ${row.product.name} ${row.sku}`}><Eye size={18} /></Link></td></tr>; })}</tbody></table></div>}
     {dialog && canMutate && <InventoryMutationDialog variants={rows} returnFocusRef={triggerRef} onClose={() => setDialog(false)} onSaved={() => { setDialog(false); void load(); }} onConflict={() => void load()} />}
  </section>;
}
