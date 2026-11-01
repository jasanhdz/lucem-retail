import { afterEach, describe, expect, it, vi } from 'vitest';
import { signIn } from '../src/services/auth';
import { getBusinesses, selectBusiness } from '../src/services/businesses';

afterEach(() => vi.unstubAllGlobals());
describe('client services', () => {
  it('preserves login request and response status', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    expect((await signIn('a@b.test', 'secret')).status).toBe(200);
    expect(fetch).toHaveBeenCalledWith('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'a@b.test', password: 'secret' }) });
  });
  it('fetches businesses and posts selected business preserving statuses', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 401 })).mockResolvedValueOnce(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    expect((await getBusinesses()).status).toBe(401);
    expect((await selectBusiness('biz')).status).toBe(200);
    expect(fetch.mock.calls).toEqual([
      ['/api/businesses'],
      ['/api/businesses/select', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId: 'biz' }) }],
    ]);
  });
});
