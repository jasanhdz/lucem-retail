import { describe, expect, it } from 'vitest';
import { canonicalReservationBatch, reservationBatchHash, validReservationBatchKey } from '@/lib/reservation-batch';

describe('reservation batch idempotency contract', () => {
  it('normalizes dates and trims optional fields while preserving line ordering', () => {
    const left = canonicalReservationBatch({ customerName: ' Cliente ', expiresAt: '2030-01-01T00:00:00.000Z', items: [{ variantId: 'b', quantity: 1, notes: ' nota ' }, { variantId: 'a', quantity: 2 }] });
    const right = canonicalReservationBatch({ customerName: 'Cliente', expiresAt: '2030-01-01T00:00:00Z', items: [{ variantId: 'b', quantity: 1, notes: 'nota' }, { variantId: 'a', quantity: 2 }] });
    const reordered = canonicalReservationBatch({ customerName: 'Cliente', expiresAt: '2030-01-01T00:00:00Z', items: [{ variantId: 'a', quantity: 2 }, { variantId: 'b', quantity: 1, notes: 'nota' }] });
    expect(left).toBe(right);
    expect(reservationBatchHash(left)).toBe(reservationBatchHash(right));
    expect(reservationBatchHash(left)).not.toBe(reservationBatchHash(reordered));
  });
  it('accepts only printable idempotency keys within the length limit', () => {
    expect(validReservationBatchKey('batch-1')).toBe(true);
    expect(validReservationBatchKey(null)).toBe(false);
    expect(validReservationBatchKey('bad\nkey')).toBe(false);
    expect(validReservationBatchKey('x'.repeat(129))).toBe(false);
  });
});
