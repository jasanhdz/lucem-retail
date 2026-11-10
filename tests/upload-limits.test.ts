import { describe, expect, it } from 'vitest';
import { readBoundedUploadBody, withinUploadLimits } from '../src/lib/upload-storage';

describe('public upload quota arithmetic', () => {
  const base = { used: BigInt(40), reserved: BigInt(10), incoming: BigInt(20), maximum: BigInt(70), free: BigInt(20), freeFloor: BigInt(0) };

  it('permits a write at the exact tenant/global and free-space boundaries', () => {
    expect(withinUploadLimits(base)).toBe(true);
  });

  it('fails closed for quota, storage-floor and invalid byte values', () => {
    expect(withinUploadLimits({ ...base, maximum: BigInt(69) })).toBe(false);
    expect(withinUploadLimits({ ...base, free: BigInt(19), freeFloor: BigInt(0) })).toBe(false);
    expect(withinUploadLimits({ ...base, incoming: BigInt(0) })).toBe(false);
    expect(withinUploadLimits({ ...base, used: BigInt(-1) })).toBe(false);
  });
});

describe('bounded upload request body', () => {
  it('accepts the exact byte limit and rejects declared, streamed, missing, or mismatched lengths', async () => {
    const exact = new Request('http://localhost/upload', { method: 'POST', headers: { 'content-length': '4' }, body: Buffer.from('1234') });
    expect((await readBoundedUploadBody(exact, 4)).toString()).toBe('1234');

    const declaredTooLarge = new Request('http://localhost/upload', { method: 'POST', headers: { 'content-length': '5' }, body: Buffer.from('12345') });
    await expect(readBoundedUploadBody(declaredTooLarge, 4)).rejects.toMatchObject({ status: 413 });

    const streamedTooLarge = new Request('http://localhost/upload', { method: 'POST', headers: { 'content-length': '6' }, body: Buffer.from('123456') });
    await expect(readBoundedUploadBody(streamedTooLarge, 5)).rejects.toMatchObject({ status: 413 });

    const mismatched = new Request('http://localhost/upload', { method: 'POST', headers: { 'content-length': '3' }, body: Buffer.from('1234') });
    await expect(readBoundedUploadBody(mismatched, 5)).rejects.toMatchObject({ status: 400 });

    const missingLength = new Request('http://localhost/upload', { method: 'POST', body: Buffer.from('1234') });
    await expect(readBoundedUploadBody(missingLength, 5)).rejects.toMatchObject({ status: 411 });
  });
});
