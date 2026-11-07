import { getAuth } from '@/lib/auth';
import { InventoryDetail } from '@/components/inventory/InventoryDetail';

export default async function InventoryDetailRoute({ params }: { params: Promise<{ variantId: string }> }) {
  const auth = await getAuth();
  const { variantId } = await params;
  return <InventoryDetail variantId={variantId} role={auth?.membership?.role ?? 'SELLER'} branchName={auth?.business?.branchName ?? ''} />;
}
