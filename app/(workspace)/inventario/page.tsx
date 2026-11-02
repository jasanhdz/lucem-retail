import { getAuth } from '@/lib/auth';
import { InventoryPage } from '@/components/inventory/InventoryPage';

export default async function InventoryRoute() {
  const auth = await getAuth();
  return <InventoryPage role={auth?.membership?.role ?? 'SELLER'} />;
}
