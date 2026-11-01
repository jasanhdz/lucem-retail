'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header, money, Stat } from '@/components/Screen';
import { SkeletonStack } from '@/components/Skeleton';
import { Boxes, DollarSign, Package, TrendingUp } from 'lucide-react';

type ReportRow = { id: string; folio: number; status: string; paymentMethod: string; total: string; user: string; userId: string; createdAt: string; units: number; cogs: string; profit: string };
type Preset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const day = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function periodRange(preset: Preset) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  if (preset === 'yesterday') { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); }
  if (preset === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (preset === 'month') start.setDate(1);
  return { from: day(start), to: day(end) };
}

export default function Reports() {
  const today = periodRange('today');
  const [preset, setPreset] = useState<Preset>('today');
  const [from, setFrom] = useState(today.from);
  const [to, setTo] = useState(today.to);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [productId, setProductId] = useState('');
  const [userId, setUserId] = useState('');
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/categories').then((response) => response.ok ? response.json() : []).then(setCategories).catch(() => setCategories([]));
    fetch('/api/products').then((response) => response.ok ? response.json() : []).then((variants) => {
      const unique = new Map<string, any>();
      for (const variant of variants) unique.set(variant.productId, { id: variant.productId, name: variant.product.name });
      setProducts([...unique.values()]);
    }).catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    let active = true;
    setRows(null);
    const params = new URLSearchParams({ from, to });
    if (paymentMethod) params.set('paymentMethod', paymentMethod);
    if (categoryId) params.set('categoryId', categoryId);
    if (productId) params.set('productId', productId);
    if (userId) params.set('userId', userId);
    fetch(`/api/reports/sales?${params}`).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => { if (active) setRows(data); }).catch(() => { if (active) setRows([]); });
    return () => { active = false; };
  }, [from, to, paymentMethod, categoryId, productId, userId]);

  const metrics = useMemo(() => (rows ?? []).reduce((sum, row) => ({
    net: sum.net + Number(row.total), units: sum.units + Number(row.units), cogs: sum.cogs + Number(row.cogs), profit: sum.profit + Number(row.profit), tickets: sum.tickets + (row.status === 'CANCELLED' ? 0 : 1),
  }), { net: 0, units: 0, cogs: 0, profit: 0, tickets: 0 }), [rows]);
  const users = useMemo(() => [...new Map((rows ?? []).map((row) => [row.userId, row.user])).entries()].map(([id, name]) => ({ id, name })), [rows]);
  const exportParams = new URLSearchParams({ from, to });
  if (paymentMethod) exportParams.set('paymentMethod', paymentMethod);
  if (categoryId) exportParams.set('categoryId', categoryId);
  if (productId) exportParams.set('productId', productId);
  if (userId) exportParams.set('userId', userId);

  function choosePeriod(value: Preset) {
    setPreset(value);
    if (value !== 'custom') { const range = periodRange(value); setFrom(range.from); setTo(range.to); }
  }

  return <>
    <Header title="Reportes" kicker="Ventas y utilidad" />
    <div className="report-periods" aria-label="Periodo del reporte">
      {([['today', 'Hoy'], ['yesterday', 'Ayer'], ['week', 'Esta semana'], ['month', 'Mes actual'], ['custom', 'Rango'] ] as [Preset, string][]).map(([value, label]) => <button type="button" key={value} className={`period-pill ${preset === value ? 'active' : ''}`} onClick={() => choosePeriod(value)}>{label}</button>)}
    </div>
    {preset === 'custom' && <div className="report-custom-range"><label className="form-label">Desde<input className="field" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="form-label">Hasta<input className="field" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>}
    <section className="report-filters" aria-label="Filtros de reporte">
      <label className="form-label">Método de pago<select className="field" aria-label="Método de pago" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="">Todos</option><option value="CASH">Efectivo</option><option value="CARD">Tarjeta</option><option value="TRANSFER">Transferencia</option></select></label>
      <label className="form-label">Categoría<select className="field" aria-label="Categoría" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Todas</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="form-label">Producto<select className="field" aria-label="Producto" value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Todos</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
      <label className="form-label">Vendedor<select className="field" aria-label="Vendedor" value={userId} onChange={(event) => setUserId(event.target.value)}><option value="">Todos</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
    </section>
    <section className="report-kpis" aria-label="Indicadores del periodo">
      <Stat icon={DollarSign} label="Ventas netas" value={rows ? money(metrics.net) : '…'} accent="#006c49" />
      <Stat icon={Boxes} label="Unidades vendidas" value={rows ? metrics.units : '…'} />
      <Stat icon={Package} label="Costo de mercancía" value={rows ? money(metrics.cogs) : '…'} />
      <Stat icon={TrendingUp} label="Utilidad bruta" value={rows ? money(metrics.profit) : '…'} accent="#006c49" />
    </section>
    <p className="report-note">Utilidad estimada con el costo guardado al momento de la venta, antes de gastos operativos e impuestos. {metrics.tickets} tickets confirmados en el periodo.</p>
    <div className="report-export"><a className="btn btn-light" href={`/api/reports/export.csv?${exportParams}`}>Exportar CSV</a><a className="btn btn-light" href={`/api/reports/export.xlsx?${exportParams}`}>Exportar Excel</a></div>
    <div className="report-layout"><section className="report-sales-section"><div className="section-heading"><div><p className="section-eyebrow">Actividad</p><h2>Últimos tickets emitidos</h2></div><span className="subtle-chip">{rows?.length ?? '…'} tickets</span></div>
      {rows === null ? <SkeletonStack count={4} className="report-skeleton-list" /> : rows.length ? <div className="report-sales">{rows.map((sale) => <article className="report-sale" key={sale.id}>
        <div className="report-sale-main"><div className="report-ticket-line"><span className="folio-chip">#{sale.folio}</span><small>{new Date(sale.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</small><span className={`payment-chip ${sale.status === 'CANCELLED' ? 'cancelled' : ''}`}>{sale.status === 'CANCELLED' ? 'Cancelada' : sale.paymentMethod === 'CASH' ? 'Efectivo' : sale.paymentMethod === 'CARD' ? 'Tarjeta' : 'Transferencia'}</span></div><div className="report-sale-meta">{sale.user} · {sale.units} {sale.units === 1 ? 'unidad' : 'unidades'}</div></div>
        <div className="report-sale-totals"><strong>{money(sale.total)}</strong><small>Utilidad {money(sale.profit)}</small></div>
      </article>)}</div> : <div className="surface-state empty-state"><Package size={26} aria-hidden="true"/><strong>No hay ventas en el periodo</strong><p>Ajusta el rango o los filtros para explorar resultados.</p></div>}</section>
      <aside className="report-side-card card"><div className="section-heading"><div><p className="section-eyebrow">Margen estimado</p><h2>Resultado del periodo</h2></div></div><div className="report-result-row"><span>Ventas netas</span><strong>{rows ? money(metrics.net) : '…'}</strong></div><div className="report-result-row"><span>Costo vendido</span><strong>{rows ? money(metrics.cogs) : '…'}</strong></div><div className="report-result-highlight"><span>Utilidad bruta</span><strong>{rows ? money(metrics.profit) : '…'}</strong></div></aside>
    </div>
  </>;
}
