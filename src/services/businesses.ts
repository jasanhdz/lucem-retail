export async function getBusinesses() {
  return fetch('/api/businesses');
}

export async function selectBusiness(businessId: string) {
  return fetch('/api/businesses/select', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId }) });
}

export async function createBusiness(data: { name: string; branchName: string; giro: string; idempotencyKey: string }) {
  return fetch('/api/businesses', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': data.idempotencyKey }, body: JSON.stringify(data) });
}
