"use client";

import { ArrowLeft, CircleAlert, History, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { InventoryMutationDialog } from "./InventoryMutationDialog";
import type { InventoryRow } from "./InventoryPage";

export function InventoryDetail({ variantId, role }: { variantId: string; role: "ADMIN" | "INVENTORY_MANAGER" | "SELLER" }) {
  const [row, setRow] = useState<InventoryRow | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [dialog, setDialog] = useState(false); const triggerRef = useRef<HTMLButtonElement>(null);
  async function load() { setLoading(true); try { const response = await fetch("/api/inventory"); const body = await response.json(); if (!response.ok) throw new Error(body.error); setRow(body.find((item: InventoryRow) => item.id === variantId) ?? null); } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo cargar el detalle."); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [variantId]);
  if (loading) return <section className="inventory-page"><p className="inventory-loading" role="status">Cargando detalle...</p></section>;
  if (error || !row) return <section className="inventory-page"><div className="inventory-alert" role="alert"><CircleAlert size={18} /> {error || "Variante no encontrada."}<button type="button" onClick={() => void load()}><RefreshCw size={16} /> Reintentar</button></div></section>;
  const variantLabel = [row.size, row.color].filter(Boolean).join(" · ") || "Presentación única";
  return <section className="inventory-page" aria-labelledby="inventory-detail-title"><Link className="inventory-back" href="/inventario"><ArrowLeft size={17} /> Inventario</Link><header className="inventory-heading"><div><span className="inventory-eyebrow">{row.product.name} · {row.sku}</span><h1 id="inventory-detail-title">Detalle de existencias</h1><p>{variantLabel} · {row.product.location || "Sin ubicación"}</p></div>{role !== "SELLER" && <button ref={triggerRef} className="button inventory-primary" type="button" onClick={() => setDialog(true)}><Plus size={18} /> Registrar movimiento</button>}</header><div className="inventory-balance-grid"><div><span>Stock físico</span><strong>{row.physical}</strong><small>Disponible + apartado</small></div><div><span>Apartado</span><strong>{row.reserved}</strong><small>Reservas activas</small></div><div><span>Disponible</span><strong>{row.available}</strong><small>Listo para operar</small></div></div><div className="inventory-detail-card"><History size={20} /><div><h2>Historial de movimientos</h2><p>Consulta el kardex completo para esta variante.</p></div><Link className="button button-quiet" href={`/inventario/movimientos?variantId=${row.id}`}>Ver historial</Link></div>{dialog && <InventoryMutationDialog variants={[row]} initialVariantId={row.id} returnFocusRef={triggerRef} onClose={() => setDialog(false)} onSaved={() => { setDialog(false); void load(); }} onConflict={() => void load()} />}</section>;
}
