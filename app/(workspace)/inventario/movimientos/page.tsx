import { InventoryMovements } from '@/components/inventory/InventoryMovements';

export default async function InventoryMovementsRoute({ searchParams }: { searchParams: Promise<{ variantId?: string }> }) {
  const params = await searchParams;
  return <InventoryMovements variantId={params.variantId} />;
}
