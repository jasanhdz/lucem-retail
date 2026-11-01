import { getAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { PreparationPlaceholder } from '@/components/PreparationPlaceholder';

export default async function Ticket({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth(); if (!auth?.business) redirect('/login');
  const { id } = await params;
  const sale = await db.sale.findFirst({ where: { id, businessId: auth.business.id }, include: { lines: { include: { variant: { include: { product: true } } } } } });
  if (!sale) notFound();
  return <PreparationPlaceholder />;
}
