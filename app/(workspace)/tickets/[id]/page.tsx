import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Check, CheckCircle2, Printer, Store, Zap } from 'lucide-react';
import { TicketPrintButton } from '@/components/pos/TicketPrintButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { getAuth } from '@/lib/auth';
import { db } from '@/lib/db';

const paymentNames: Record<string, string> = { CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia' };
const cash = (value: unknown) => Number(value ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function Ticket({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth?.business) redirect('/login');
  const { id } = await params;
  const sale = await db.sale.findFirst({
    where: { id, businessId: auth.business.id },
    include: { user: { select: { name: true } }, lines: { include: { variant: { include: { product: true } } } } },
  });
  if (!sale) notFound();

  const units = sale.lines.reduce((sum, line) => sum + Number(line.quantity), 0);
  const saleStatus = sale.status === 'CONFIRMED' ? 'Venta lista' : 'Venta cancelada';
  const saleDate = new Date(sale.createdAt);
  const dateLabel = saleDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeLabel = saleDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <main className="ticket-success-page">
      <Breadcrumbs className="ticket-breadcrumb" items={[{ label: 'Operaciones' }, { label: 'Punto de venta', href: '/pos' }, { label: `Ticket #${sale.folio}` }]} />
      <section className="ticket-success-banner" aria-label="Venta registrada">
        <span className="ticket-success-mark"><Check size={22} aria-hidden="true" /></span>
        <div className="ticket-success-message"><h1>{sale.status === 'CONFIRMED' ? '¡Venta registrada con éxito!' : 'Venta cancelada'}</h1><span>{sale.user.name} · Caja cuadrada</span></div>
        <span className="ticket-success-badge">{sale.status === 'CONFIRMED' && <CheckCircle2 size={13} aria-hidden="true" />}{sale.status === 'CONFIRMED' ? 'Completada' : 'Cancelada'}</span>
        <div className="ticket-success-total"><span>Total cobrado</span><strong>${cash(sale.total)} MXN</strong></div>
        <Link className="ticket-next-sale" href="/pos"><Zap size={17} aria-hidden="true" />Siguiente venta <kbd>F1</kbd></Link>
      </section>

      <div className="ticket-success-grid">
        <article className="ticket-receipt" aria-label={`Ticket de venta folio ${sale.folio}`}>
          <header className="ticket-receipt-heading">
            <span className="ticket-receipt-store"><Store size={17} aria-hidden="true" /></span>
            <strong>{auth.business.name}</strong>
            <span>{auth.business.branchName}</span>
            <small>Comprobante de compra · {auth.business.name}</small>
          </header>
          <div className="ticket-receipt-folio"><strong>FOLIO: #TK-{sale.folio}</strong><span>{dateLabel} | {timeLabel} hrs</span></div>
          <div className="ticket-receipt-lines">
            <div className="ticket-receipt-columns"><span>Descripción</span><span>Importe</span></div>
            {sale.lines.map((line) => {
              const details = [line.variant.size && `Talla ${line.variant.size}`, line.variant.color].filter(Boolean).join(' • ');
              return <div className="ticket-receipt-line" key={line.id}>
                <div><strong>{Number(line.quantity)}x {line.variant.product.name}</strong><small>{details || `SKU ${line.variant.sku}`} · P.U. ${cash(line.unitPrice)}</small></div>
                <b>${cash(line.lineTotal)}</b>
              </div>;
            })}
          </div>
          <div className="ticket-receipt-totals">
            <div className="ticket-receipt-grand-total"><span>Total pagado</span><strong>${cash(sale.total)} MXN</strong></div>
            <div><span>Partidas / Unidades:</span><strong>{units} unidades en {sale.lines.length} partidas</strong></div>
            <div><span>Forma de pago: {paymentNames[sale.paymentMethod] ?? sale.paymentMethod}</span><strong>{sale.receivedAmount == null ? `$${cash(sale.total)} MXN` : `$${cash(sale.receivedAmount)} MXN`}</strong></div>
            {sale.receivedAmount != null && <div className="ticket-receipt-change"><span>Cambio entregado:</span><strong>${cash(sale.changeAmount)} MXN</strong></div>}
          </div>
          <footer className="ticket-receipt-thanks"><strong>¡Gracias por su compra!</strong><span>Conserve este comprobante para cualquier cambio o garantía dentro de los próximos 30 días.</span></footer>
        </article>

        <aside className="ticket-success-actions" aria-label="Acciones del ticket">
          <section className="ticket-next-customer">
            <span className="ticket-ready-badge"><i aria-hidden="true" />Operación lista</span>
            <span className="ticket-register-icon"><Store size={22} aria-hidden="true" /></span>
            <h2>Atender siguiente cliente</h2>
            <p>La venta quedó registrada en el libro diario de caja y las existencias se actualizaron.</p>
            <Link href="/pos"><Zap size={18} aria-hidden="true" />Nueva venta <kbd>Espacio / F1</kbd></Link>
          </section>

          <section className="ticket-printer-card">
            <span className="ticket-printer-icon"><Printer size={18} aria-hidden="true" /></span>
            <div className="ticket-printer-copy"><strong>Ticket de venta</strong><span>Listo para imprimir o guardar como PDF</span></div>
            <span className="ticket-paper-size">80 mm</span>
            <div className="ticket-printer-actions"><TicketPrintButton className="ticket-print-action" /><TicketPrintButton variant="pdf" label="Descargar ticket (PDF)" className="ticket-download-action" /></div>
          </section>

          <div className="ticket-success-metrics">
            <section><span>Total unidades</span><strong>{units} {units === 1 ? 'unidad' : 'unidades'}</strong><small>En {sale.lines.length} partidas</small></section>
            <section><span>Estado operativo</span><strong>{saleStatus}</strong><small>{sale.status === 'CONFIRMED' ? 'Caja balanceada' : 'Revisar operación'}</small></section>
          </div>
        </aside>
      </div>
    </main>
  );
}
