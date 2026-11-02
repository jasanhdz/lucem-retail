import { ReturnsPage } from '@/components/returns/ReturnsPage';
import { getAuth } from '@/lib/auth';

export default async function DevolucionesPage() {
  const auth = await getAuth();
  return <ReturnsPage role={auth?.membership?.role ?? 'SELLER'} />;
}
