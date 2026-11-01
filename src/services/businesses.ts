export async function getBusinesses() {
  return fetch('/api/businesses');
}

export async function selectBusiness(businessId: string) {
  return fetch('/api/businesses/select', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId }) });
}
