export async function getBusinesses() {
  return fetch('/api/businesses', { credentials: 'include', cache: 'no-store' });
}

export async function selectBusiness(businessId: string) {
  return fetch('/api/businesses/select', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId }) });
}

export async function createBusiness(data: { name: string; branchName: string; giro: string; idempotencyKey: string; currency?: string; timezone?: string; country?: string; description?: string }) {
  return fetch('/api/businesses', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': data.idempotencyKey }, body: JSON.stringify(data) });
}
