import { getAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { money } from '@/lib/money';
import { TicketActions } from '../TicketActions';

export default async function Ticket({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(); if (!auth?.business) redirect('/login');
  const { id } = await params;
  const sale = await db.sale.findFirst({ where: { id, businessId: auth.business.id }, include: { lines: { include: { variant: { include: { product: true } } } } } });
  if (!sale) notFound();
  return <main style={{ maxWidth: 560, margin: '40px auto', padding: 20 }}><article className="card" style={{ padding: 28 }}><h1>Ticket #{sale.folio}</h1><p className="muted">{sale.createdAt.toLocaleString('es-MX')} · {sale.paymentMethod}</p>{sale.lines.map(line => <div key={line.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}><span>{line.variant.product.name} x {line.quantity.toString()}</span><span>{money(line.lineTotal.toString())}</span></div>)}<hr /><h2>Total <span style={{ float: 'right' }}>{money(sale.total.toString())}</span></h2><p>Recibido: {money(sale.receivedAmount?.toString() ?? sale.total.toString())}<br />Cambio: {money(sale.changeAmount.toString())}</p><TicketActions /></article><style>{'@media print{button{display:none}body{background:white}}'}</style></main>;
}
