import { getAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { TicketPrintButton } from '@/components/pos/TicketPrintButton';

export default async function Ticket({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(); if (!auth?.business) redirect('/login');
  const { id } = await params;
  const sale = await db.sale.findFirst({ where: { id, businessId: auth.business.id }, include: { user: { select: { name: true } }, lines: { include: { variant: { include: { product: true } } } } } });
  if (!sale) notFound();
  const money = (value: unknown) => Number(value).toFixed(2);
  return <main className="ticket-page"><article className="ticket-card"><header><p className="pos-kicker">Lucem Retail · Ticket de compra</p><h1>Folio #{sale.folio}</h1><p>{new Date(sale.createdAt).toLocaleString('es-MX')} · Vendedor: {sale.user.name}</p></header><div className="ticket-lines">{sale.lines.map((line) => <div className="ticket-line" key={line.id}><div><strong>{line.variant.product.name}</strong><small>SKU {line.variant.sku} · {line.quantity.toString()} × ${money(line.unitPrice)}</small></div><b>${money(line.lineTotal)}</b></div>)}</div><dl className="ticket-summary"><div><dt>Total</dt><dd>${money(sale.total)} MXN</dd></div><div><dt>Pago</dt><dd>{({ CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia' } as Record<string, string>)[sale.paymentMethod]}</dd></div>{sale.receivedAmount != null && <div><dt>Recibido / Cambio</dt><dd>${money(sale.receivedAmount)} / ${money(sale.changeAmount)}</dd></div>}</dl><div className="ticket-actions"><TicketPrintButton /><Link className="button" href="/pos">Nueva venta</Link></div></article></main>;
}
