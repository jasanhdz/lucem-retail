import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { clearOwnedFixtures } from '../scripts/e2e/seed';

describe('owned E2E fixture cleanup', () => {
  it('deletes only the exact business/user namespace and leaves global rate buckets untouched', async () => {
    const deleted: Array<{ model: string; where: unknown }> = [];
    const model = (name: string, rows: unknown[] = []) => ({
      findMany: async () => rows,
      count: async () => 0,
      deleteMany: async ({ where }: { where: unknown }) => { deleted.push({ model: name, where }); return { count: 0 }; },
    });
    const tx = {
      sale: model('sale', [{ id: 'sale-owned' }]),
      return: model('return', [{ id: 'return-owned' }]),
      returnLine: model('returnLine'),
      saleIdempotency: model('saleIdempotency'),
      saleLine: model('saleLine'),
      reservationBatchIdempotency: model('reservationBatchIdempotency'),
      reservation: model('reservation'),
      priceCostHistory: model('priceCostHistory'),
      inventoryMovement: model('inventoryMovement'),
      productVariant: model('productVariant'),
      product: model('product'),
      category: model('category'),
      uploadQuotaCounter: model('uploadQuotaCounter'),
      auditLog: model('auditLog'),
      session: model('session'),
      membership: model('membership'),
      businessCreationIdempotency: model('businessCreationIdempotency'),
      business: model('business'),
      user: model('user'),
    };
    const db = {
      ...tx,
      $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    } as unknown as PrismaClient;

    await clearOwnedFixtures(db, { businessIds: ['qa-run-17-centro'], userIds: ['qa-run-17-admin'] });

    expect(deleted.some(({ model: name }) => /abuseRateLimitBucket|all/i.test(name))).toBe(false);
    expect(deleted.find(({ model: name }) => name === 'business')?.where).toEqual({ id: { in: ['qa-run-17-centro'] } });
    expect(deleted.find(({ model: name }) => name === 'user')?.where).toEqual({ id: { in: ['qa-run-17-admin'] } });
    expect(deleted.find(({ model: name }) => name === 'saleLine')?.where).toEqual({ saleId: { in: ['sale-owned'] } });
    expect(deleted.find(({ model: name }) => name === 'returnLine')?.where).toEqual({ returnId: { in: ['return-owned'] } });
    expect(deleted.find(({ model: name }) => name === 'uploadQuotaCounter')?.where).toEqual({ businessId: { in: ['qa-run-17-centro'] } });
    expect(deleted.every(({ where }) => where !== undefined)).toBe(true);
  });

  it('does not open a transaction for an empty ownership list', async () => {
    let transactions = 0;
    const db = { $transaction: async () => { transactions += 1; } } as unknown as PrismaClient;
    await clearOwnedFixtures(db, {});
    expect(transactions).toBe(0);
  });
});
