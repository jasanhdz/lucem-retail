'use client';

import { Barcode, Bookmark, CheckCircle2, ChevronRight, CircleAlert, Download, Eye, Package, Plus, RefreshCw, Search, SlidersHorizontal, Store } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { InventoryMutationDialog } from './InventoryMutationDialog';
import type { InventoryRow } from './InventoryPage';

type Role = 'ADMIN' | 'INVENTORY_MANAGER' | 'SELLER';
type Movement = { id: string; type: string; quantity: string; reason?: string | null; referenceType?: string | null; referenceId?: string | null; createdAt: string; user: { name: string }; variant: { sku: string } };
type MovementResponse = { items: Movement[]; total: number };
type MutationType = 'PURCHASE' | 'ADJUSTMENT_IN';
type DetailTab = 'MOVEMENTS' | 'VARIANTS';
const labels: Record<string, string> = { INITIAL: 'Inventario inicial', PURCHASE: 'Entrada de stock', ADJUSTMENT_IN: 'Ajuste positivo', ADJUSTMENT_OUT: 'Ajuste negativo', RESERVATION: 'Apartado registrado', RELEASE: 'Liberación de apartado', SALE: 'Venta en mostrador', SALE_CANCEL: 'Cancelación de venta', RETURN: 'Devolución' };
const number = (value: string | number) => Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 });

export function InventoryDetail({ variantId, role, branchName = '' }: { variantId: string; role: Role; branchName?: string }) {
  const [row, setRow] = useState<InventoryRow | null>(null);
  const [variants, setVariants] = useState<InventoryRow[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [movementTotal, setMovementTotal] = useState(0);
  const [movementQuery, setMovementQuery] = useState('');
  const [activeTab, setActiveTab] = useState<DetailTab>('MOVEMENTS');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [countMode, setCountMode] = useState(false);
  const [mutationType, setMutationType] = useState<MutationType>('PURCHASE');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const canMutate = role !== 'SELLER';

  async function load() {
    setLoading(true);
    setError('');
    try {
      const inventoryResponse = await fetch('/api/inventory');
      const inventory: InventoryRow[] = await inventoryResponse.json();
      if (!inventoryResponse.ok) throw new Error('No se pudo cargar el inventario.');
      const selected = inventory.find((item) => item.id === variantId) ?? null;
      setRow(selected);
      setVariants(selected ? inventory.filter((item) => item.product.id === selected.product.id) : []);
      const movementResponse = await fetch(`/api/inventory/movements?variantId=${encodeURIComponent(variantId)}&page=1&pageSize=100`);
      const movementBody = await movementResponse.json() as MovementResponse;
      if (!movementResponse.ok) throw new Error(movementBody as unknown as string);
      setMovements(movementBody.items ?? []);
      setMovementTotal(Number(movementBody.total ?? 0));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar el detalle.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [variantId]);

  const variantLabel = row ? [row.size, row.color].filter(Boolean).join(' · ') || 'Presentación única' : '';
  const available = Number(row?.available ?? 0);
  const reserved = Number(row?.reserved ?? 0);
  const physical = Number(row?.physical ?? 0);
  const threshold = Number(row?.lowStockThreshold ?? 0);
  const cost = Number(row?.cost ?? 0);
  const price = Number(row?.price ?? 0);
  const margin = price > 0 ? Math.round(((price - cost) / price) * 1000) / 10 : 0;
  const status = available <= 0 ? 'Agotado' : available <= threshold ? 'Stock bajo' : 'Disponible';
  const statusClass = available <= 0 ? 'is-out' : available <= threshold ? 'is-low' : 'is-available';
  const progress = threshold > 0 ? Math.min(100, available / threshold * 100) : 100;
  const otherVariants = useMemo(() => variants.filter((variant) => variant.id !== variantId), [variants, variantId]);
  const recentMovements = movements.filter((item) => `${item.type} ${item.reason ?? ''} ${item.referenceType ?? ''} ${item.referenceId ?? ''}`.toLowerCase().includes(movementQuery.toLowerCase()));
  const movementPhysical = useMemo(() => {
    let balance = physical;
    const results = new Map<string, number>();
    for (const item of movements) {
      results.set(item.id, balance);
      if (!['RESERVATION', 'RELEASE'].includes(item.type)) balance -= Number(item.quantity);
    }
    return results;
  }, [movements, physical]);

  function openMutation(type: MutationType, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setCountMode(false);
    setMutationType(type);
    setDialog(true);
  }
  function openPhysicalCount(trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setCountMode(true);
    setMutationType('ADJUSTMENT_IN');
    setDialog(true);
  }
  function exportMovements() {
    const fields = ['Fecha y hora', 'Tipo', 'Cantidad', 'Motivo', 'Referencia', 'Responsable', 'SKU'];
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const content = [fields, ...movements.map((item) => [new Date(item.createdAt).toLocaleString('es-MX'), labels[item.type] ?? item.type, item.quantity, item.reason, item.referenceId, item.user.name, item.variant.sku])];
    const blob = new Blob([`\uFEFF${content.map((line) => line.map(escape).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `kardex-${row?.sku ?? 'variante'}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <section className="inventory-page inventory-detail-page"><p className="inventory-loading" role="status">Cargando detalle...</p></section>;
  if (error || !row) return <section className="inventory-page inventory-detail-page"><div className="inventory-alert" role="alert"><CircleAlert size={18} />{error || 'Variante no encontrada.'}<button type="button" onClick={() => void load()}><RefreshCw size={16} />Reintentar</button></div></section>;

  return <section className="inventory-page inventory-detail-page" aria-labelledby="inventory-detail-title">
     <div className="inventory-detail-breadcrumb"><div className="inventory-detail-path"><Breadcrumbs items={[{ label: 'Operaciones' }, { label: 'Inventario', href: '/inventario' }, { label: `${row.product.name} (${variantLabel})` }]} /></div><span className="inventory-detail-register"><i aria-hidden="true"/>{branchName || 'Sucursal activa'} <b>•</b> ID Registro: #{row.id}</span></div>
    <header className="inventory-detail-hero">
      {row.product.photoPath ? <img src={row.product.photoPath} alt="" /> : <span className="inventory-detail-placeholder"><Package size={30} aria-hidden="true" /></span>}
      <div className="inventory-detail-hero-copy"><span className="inventory-eyebrow">{row.product.category?.name ?? 'Inventario'}</span><h1 id="inventory-detail-title">{row.product.name}</h1><div className="inventory-detail-tags"><span>{variantLabel}</span><span className={`inventory-general-status ${statusClass}`}><i />{status}</span><span className="inventory-detail-pos-badge">Activo POS</span></div><p><span><Barcode size={14} aria-hidden="true" />SKU: <strong>{row.sku}</strong></span>{row.barcode && <span><Barcode size={14} aria-hidden="true" />Código de barras: <strong>{row.barcode}</strong></span>}<span><Store size={14} aria-hidden="true" />{row.product.category?.name ?? 'Sin categoría'}</span><span>{row.product.location || 'Sin ubicación'}</span></p></div>
      <div className="inventory-detail-actions"><Link href={`/inventario/movimientos?variantId=${row.id}`}><Barcode size={15} aria-hidden="true" />Ver kárdex completo</Link>{canMutate && <><button type="button" onClick={(event) => openMutation('ADJUSTMENT_IN', event.currentTarget)}><SlidersHorizontal size={15} aria-hidden="true" />Realizar ajuste</button><button type="button" className="inventory-primary" onClick={(event) => openMutation('PURCHASE', event.currentTarget)}><Plus size={16} aria-hidden="true" />Registrar entrada</button></>}</div>
    </header>

    <section className="inventory-detail-metrics" aria-label="Estado de existencias">
      <article><div><span>Existencia física</span><i><Package size={17} /></i></div><strong>{number(physical)} <small>unidades</small></strong><p>Disponible + apartado en tienda.</p><footer><span>En piso y almacén</span><b>Inventario verificado</b></footer></article>
      <article className="is-reserved"><div><span>Cantidad apartada</span><i><Bookmark size={17} /></i></div><strong>{number(reserved)} <small>unidades</small></strong><p>Comprometida en pedidos y apartados.</p><footer><span>Reservas activas</span><b>{reserved > 0 ? `${number(reserved)} apartadas` : 'Sin apartados'}</b></footer></article>
      <article className="is-available"><div><span>Disponible para venta</span><i><Store size={17} /></i></div><strong>{number(available)} <small>unidades</small></strong><p>Inmediato para terminal POS y despacho directo sin reservas.</p><footer><span><CheckCircle2 size={12} />Stock operativo óptimo</span><b>Física − Apartados</b></footer></article>
      <article className="is-parameters"><div><span>Parámetros de stock</span><i><SlidersHorizontal size={17} /></i></div><div className="inventory-threshold-cards"><span>Alerta mínima<strong>{number(threshold)} unidades</strong></span><span>Margen bruto<strong>{number(margin)}%</strong></span></div><p>Costo: <strong>${number(cost)}</strong> · PVP: <strong>${number(price)} MXN</strong></p></article>
    </section>

      <div className="inventory-detail-notice"><CheckCircle2 size={16} aria-hidden="true" /><span><strong>Control de existencias:</strong> El balance se actualiza mediante entradas documentadas, ventas o ajustes justificados. Los apartados reservan disponible sin alterar el conteo físico en tienda.</span></div>

      <section className="inventory-detail-movements" aria-labelledby="inventory-recent-movements-title">
        <div className="inventory-detail-tabs" role="tablist" aria-label="Actividad de la variante">
          <button id="inventory-movements-tab" type="button" role="tab" aria-selected={activeTab === 'MOVEMENTS'} className={activeTab === 'MOVEMENTS' ? 'is-active' : ''} onClick={() => setActiveTab('MOVEMENTS')}><RefreshCw size={14} aria-hidden="true" />Movimientos recientes de esta variante <b>{movementTotal}</b></button>
          <button type="button" role="tab" aria-selected={activeTab === 'VARIANTS'} className={activeTab === 'VARIANTS' ? 'is-active' : ''} onClick={() => setActiveTab('VARIANTS')}><Package size={14} aria-hidden="true" />Otras variantes del producto <b>{otherVariants.length}</b></button>
        </div>
        {activeTab === 'MOVEMENTS' ? <>
          <div className="inventory-detail-movement-toolbar"><label className="inventory-search"><Search size={15} aria-hidden="true" /><span className="sr-only">Filtrar movimientos</span><input aria-label="Filtrar movimientos" placeholder="Filtrar por ticket o motivo..." value={movementQuery} onChange={(event) => setMovementQuery(event.target.value)} /></label><Link href={`/inventario/movimientos?variantId=${row.id}`} aria-label="Abrir filtros de movimientos"><SlidersHorizontal size={16} /></Link></div>
          {recentMovements.length === 0 ? <div className="inventory-detail-no-movements">{movements.length ? 'No hay movimientos que coincidan con el filtro.' : 'Aún no hay movimientos para esta variante.'}</div> : <div className="inventory-detail-movement-table-wrap"><table className="inventory-detail-movement-table"><thead><tr><th>Fecha y hora</th><th>Tipo de movimiento</th><th>Cantidad</th><th>Resultado físico</th><th>Motivo / referencia</th><th>Responsable</th><th>Acciones</th></tr></thead><tbody>{recentMovements.slice(0, 5).map((item) => {
            const quantity = Number(item.quantity);
            const positive = quantity > 0;
            return <tr key={item.id}><td><strong>{new Date(item.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</strong><small>{new Date(item.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</small></td><td><span className={`inventory-movement-kind ${positive ? 'is-in' : 'is-out'}`}><i />{labels[item.type] ?? item.type}</span></td><td className={positive ? 'is-positive' : 'is-negative'}>{quantity > 0 ? '+' : ''}{number(quantity)} pza</td><td><strong>{number(movementPhysical.get(item.id) ?? physical)} pzas</strong></td><td><div className="inventory-movement-reason"><strong>{item.referenceType ? `${item.referenceType}${item.referenceId ? ` #${item.referenceId}` : ''}` : item.reason || 'Movimiento registrado'}</strong><small>{item.reason || 'Sin motivo adicional'}</small></div></td><td><span className="inventory-movement-user"><i>{item.user.name.split(/\s+/).map((name) => name[0]).slice(0,2).join('').toUpperCase()}</i>{item.user.name}</span></td><td><Link href={`/inventario/movimientos?variantId=${row.id}`} aria-label={`Ver movimiento ${labels[item.type] ?? item.type}`}><Eye size={15} aria-hidden="true" /></Link></td></tr>;
          })}</tbody></table></div>}
          <footer className="inventory-detail-movement-footer"><span><CheckCircle2 size={14} aria-hidden="true" />Kárdex al día · Mostrando {Math.min(recentMovements.length, 5)} de {movementTotal} movimientos registrados</span><div><button type="button" onClick={exportMovements}><Download size={14} aria-hidden="true" />Exportar movimientos</button>{canMutate && <button type="button" onClick={(event) => openPhysicalCount(event.currentTarget)}><Package size={14} aria-hidden="true" />Iniciar conteo físico</button>}</div></footer>
        </> : <div className="inventory-related-variants" role="tabpanel" aria-label="Otras variantes del producto"><div>{otherVariants.map((variant) => <Link key={variant.id} href={`/inventario/${variant.id}`}><span>{[variant.size, variant.color].filter(Boolean).join(' / ') || 'Presentación única'}</span><strong>{number(variant.available)} disp.</strong><small>SKU {variant.sku}</small></Link>)}</div></div>}
    </section>

     {dialog && canMutate && <InventoryMutationDialog variants={variants} initialVariantId={row.id} initialType={mutationType} countMode={countMode} branchName={branchName} returnFocusRef={triggerRef} onClose={() => setDialog(false)} onSaved={() => { setDialog(false); void load(); }} onConflict={() => void load()} />}
  </section>;
}
