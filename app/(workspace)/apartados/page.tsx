import { ReservationsPage } from '@/components/reservations/ReservationsPage';
import { getAuth } from '@/lib/auth';

export default async function ApartadosPage() {
  const auth = await getAuth();
  return <ReservationsPage role={auth?.membership?.role ?? 'SELLER'} />;
}
