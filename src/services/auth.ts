export async function signIn(email: string, password: string) {
  return fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
}

export async function registerAccount(data: { name: string; email: string; password: string; confirmation: string; terms: boolean }) {
  return fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}
