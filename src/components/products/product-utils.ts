export type ProductVariant = {
  id?: string;
  sku: string;
  barcode?: string | null;
  size?: string | null;
  color?: string | null;
  cost: string | number;
  price: string | number;
  promoPrice?: string | number | null;
  stock: string | number;
  lowStockThreshold: string | number;
};

export type ProductRow = ProductVariant & {
  businessId: string;
  productId: string;
  product: { id: string; name: string; photoPath?: string | null; location?: string | null; category?: { id: string; name: string } | null };
};

export type ProductGroup = {
  id: string;
  name: string;
  photoPath: string | null;
  location: string;
  category: { id: string; name: string } | null;
  variants: ProductRow[];
  stock: number;
  threshold: number;
  state: 'stock' | 'low' | 'out';
};

export function amount(value: string | number | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function groupProductRows(rows: ProductRow[]): ProductGroup[] {
  const grouped = new Map<string, ProductGroup>();
  for (const row of rows) {
    const product = row.product;
    const current = grouped.get(product.id);
    if (current) {
      current.variants.push(row);
      current.stock += amount(row.stock);
      current.threshold += amount(row.lowStockThreshold);
      current.state = current.stock === 0 ? 'out' : current.stock <= current.threshold ? 'low' : 'stock';
      continue;
    }
    const stock = amount(row.stock);
    const threshold = amount(row.lowStockThreshold);
    grouped.set(product.id, {
      id: product.id,
      name: product.name,
      photoPath: product.photoPath ?? null,
      location: product.location || 'Sin ubicación',
      category: product.category ?? null,
      variants: [row],
      stock,
      threshold,
      state: stock === 0 ? 'out' : stock <= threshold ? 'low' : 'stock',
    });
  }
  return [...grouped.values()];
}

export function validateProductDraft(name: string, categoryId: string, variants: Array<{ sku: string; cost: string; price: string; stock: string; lowStockThreshold: string; barcode?: string; promoPrice?: string }>, editing = false) {
  const errors: string[] = [];
  if (!name.trim()) errors.push('El nombre del producto es obligatorio.');
  if (!categoryId) errors.push('Selecciona una categoría.');
  if (!variants.length) errors.push('Agrega al menos una variante.');
  const skus = new Set<string>();
  const barcodes = new Set<string>();
  variants.forEach((variant, index) => {
    const label = `Variante ${index + 1}`;
    if (!variant.sku.trim()) errors.push(`${label}: el SKU es obligatorio.`);
    const normalizedSku = variant.sku.trim().toLowerCase();
    if (normalizedSku && skus.has(normalizedSku)) errors.push(`${label}: el SKU está repetido en este formulario.`);
    if (normalizedSku) skus.add(normalizedSku);
    const normalizedBarcode = variant.barcode?.trim().toLowerCase() ?? '';
    if (normalizedBarcode && barcodes.has(normalizedBarcode)) errors.push(`${label}: el barcode está repetido en este formulario.`);
    if (normalizedBarcode) barcodes.add(normalizedBarcode);
    for (const [field, value] of [['costo', variant.cost], ['precio', variant.price], ['stock', variant.stock], ['umbral', variant.lowStockThreshold]] as const) {
      if (value === '' || !Number.isFinite(Number(value)) || Number(value) < 0) errors.push(`${label}: ${field} debe ser un número no negativo.`);
    }
    if (variant.promoPrice !== undefined && variant.promoPrice !== '' && (!Number.isFinite(Number(variant.promoPrice)) || Number(variant.promoPrice) < 0)) errors.push(`${label}: promoción debe ser un número no negativo.`);
    if (variant.promoPrice !== undefined && variant.promoPrice !== '' && variant.price !== '' && Number.isFinite(Number(variant.promoPrice)) && Number.isFinite(Number(variant.price)) && Number(variant.promoPrice) > Number(variant.price)) errors.push(`${label}: promoción no puede ser mayor que el precio normal.`);
  });
  if (editing && !variants.length) errors.push('Conserva o agrega una variante.');
  return errors;
}
