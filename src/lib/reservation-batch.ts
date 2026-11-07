import { createHash } from 'node:crypto';

export type ReservationBatchItem = { variantId: string; quantity: number; notes?: string | null };
export function canonicalReservationBatch(value: { customerName?: string | null; expiresAt: string; items: ReservationBatchItem[] }) {
  return JSON.stringify({ customerName: value.customerName?.trim() || null, expiresAt: new Date(value.expiresAt).toISOString(), items: value.items.map(item => ({ variantId: item.variantId, quantity: Number(item.quantity), notes: item.notes?.trim() || null })) });
}
export function reservationBatchHash(canonical: string) { return createHash('sha256').update(canonical).digest('hex'); }
export function validReservationBatchKey(value: string | null) { return !!value && value.length <= 128 && /^[\x21-\x7e]+$/.test(value); }
