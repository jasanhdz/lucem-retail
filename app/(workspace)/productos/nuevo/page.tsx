import { redirect } from "next/navigation";
import { ProductCatalog } from "@/components/products/ProductCatalog";
import { getAuth } from "@/lib/auth";

export default async function NewProductPage() {
  const auth = await getAuth();
  const role = auth?.membership?.role ?? "SELLER";

  if (role === "SELLER") redirect("/productos");

  return (
    <ProductCatalog
      role={role}
      businessName={auth?.business?.name ?? ""}
      initialCreate
    />
  );
}
