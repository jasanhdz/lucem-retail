import { getAuth } from '@/lib/auth';
import { ProductCatalog } from '@/components/products/ProductCatalog';

export default async function ProductsPage() {
  const auth = await getAuth();
  return <ProductCatalog role={auth?.membership?.role ?? 'SELLER'} />;
}
