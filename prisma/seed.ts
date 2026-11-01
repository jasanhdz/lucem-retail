import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

const categories = [
  'Pantalones', 'Playeras', 'Sudaderas', 'Accesorios', 'Chamarras',
  'Vestidos', 'Faldas', 'Calzado', 'Bolsas',
];

const photoIds = [
  'photo-1529139574466-a303027c1d8b',
  'photo-1483985988355-763728e1935b',
  'photo-1539109136881-3be0616acf4b',
  'photo-1515886657613-9f3515b0c78f',
  'photo-1490481651871-ab68de25d43d',
  'photo-1503342217505-b0a15ec3261c',
  'photo-1512436991641-6745cdb1723f',
  'photo-1521572163474-6864f9cf17ab',
  'photo-1551028719-00167b16eac5',
  'photo-1542272604-787c3835535d',
  'photo-1525507119028-ed4c629a60a3',
  'photo-1551488831-00ddcb6c6bd3',
];

const catalog: Array<{ name: string; category: string; cost: number; price: number }> = [
  { name: 'Pantalón Jogger Cargo', category: 'Pantalones', cost: 35, price: 150 },
  { name: 'Jeans Recto Índigo', category: 'Pantalones', cost: 48, price: 199 },
  { name: 'Jeans Slim Fit Negro', category: 'Pantalones', cost: 52, price: 220 },
  { name: 'Pantalón Wide Leg', category: 'Pantalones', cost: 60, price: 249 },
  { name: 'Pantalón Chino Arena', category: 'Pantalones', cost: 55, price: 229 },
  { name: 'Jeans Mom Fit Azul Claro', category: 'Pantalones', cost: 58, price: 239 },
  { name: 'Pantalón Parachute Olivo', category: 'Pantalones', cost: 62, price: 259 },
  { name: 'Jeans Straight Vintage', category: 'Pantalones', cost: 54, price: 225 },
  { name: 'Pantalón Sastre Relaxed', category: 'Pantalones', cost: 70, price: 289 },
  { name: 'Short Denim Desgastado', category: 'Pantalones', cost: 32, price: 139 },
  { name: 'Playera Básica Oversize', category: 'Playeras', cost: 22, price: 89 },
  { name: 'Playera Essential Cuello V', category: 'Playeras', cost: 18, price: 79 },
  { name: 'Playera Gráfica Downtown', category: 'Playeras', cost: 28, price: 119 },
  { name: 'Playera Boxy Fit Crudo', category: 'Playeras', cost: 25, price: 105 },
  { name: 'Top Ribbed Manga Larga', category: 'Playeras', cost: 24, price: 99 },
  { name: 'Polo Piqué Clásica', category: 'Playeras', cost: 38, price: 159 },
  { name: 'Playera Heavy Cotton', category: 'Playeras', cost: 30, price: 129 },
  { name: 'Top Halter Minimal', category: 'Playeras', cost: 21, price: 95 },
  { name: 'Playera Vintage Sunset', category: 'Playeras', cost: 27, price: 115 },
  { name: 'Blusa Satinada Noche', category: 'Playeras', cost: 42, price: 179 },
  { name: 'Sudadera Fleece Negra', category: 'Sudaderas', cost: 75, price: 240 },
  { name: 'Hoodie Essential Gris', category: 'Sudaderas', cost: 82, price: 279 },
  { name: 'Crewneck College Verde', category: 'Sudaderas', cost: 68, price: 249 },
  { name: 'Hoodie Zip Minimal', category: 'Sudaderas', cost: 90, price: 319 },
  { name: 'Sudadera Crop Lavanda', category: 'Sudaderas', cost: 65, price: 229 },
  { name: 'Hoodie Graphic Studio', category: 'Sudaderas', cost: 88, price: 299 },
  { name: 'Sudadera Half-Zip Arena', category: 'Sudaderas', cost: 92, price: 329 },
  { name: 'Crewneck Logo Bordado', category: 'Sudaderas', cost: 72, price: 259 },
  { name: 'Gorra Snapback Urban', category: 'Accesorios', cost: 20, price: 65 },
  { name: 'Gorra Dad Hat Canvas', category: 'Accesorios', cost: 18, price: 69 },
  { name: 'Cinturón Reversible Negro', category: 'Accesorios', cost: 25, price: 99 },
  { name: 'Lentes Urban Black', category: 'Accesorios', cost: 30, price: 119 },
  { name: 'Calcetas Crew Pack x3', category: 'Accesorios', cost: 16, price: 59 },
  { name: 'Gorro Beanie Canalé', category: 'Accesorios', cost: 22, price: 79 },
  { name: 'Cinturón Táctico Olivo', category: 'Accesorios', cost: 28, price: 109 },
  { name: 'Set Pulseras Acero', category: 'Accesorios', cost: 19, price: 85 },
  { name: 'Chamarra Bomber Denim', category: 'Chamarras', cost: 115, price: 399 },
  { name: 'Chamarra Biker Vegan', category: 'Chamarras', cost: 145, price: 499 },
  { name: 'Sobrecamisa Workwear', category: 'Chamarras', cost: 95, price: 349 },
  { name: 'Chamarra Puffer Corta', category: 'Chamarras', cost: 160, price: 549 },
  { name: 'Windbreaker Colorblock', category: 'Chamarras', cost: 105, price: 379 },
  { name: 'Trench Coat Ligero', category: 'Chamarras', cost: 175, price: 599 },
  { name: 'Vestido Midi Satinado', category: 'Vestidos', cost: 78, price: 289 },
  { name: 'Vestido Camisero Rayas', category: 'Vestidos', cost: 70, price: 259 },
  { name: 'Vestido Slip Negro', category: 'Vestidos', cost: 65, price: 239 },
  { name: 'Vestido Ribbed Arena', category: 'Vestidos', cost: 72, price: 269 },
  { name: 'Vestido Floral Noche', category: 'Vestidos', cost: 90, price: 329 },
  { name: 'Vestido Denim Utility', category: 'Vestidos', cost: 98, price: 359 },
  { name: 'Falda Cargo Mini Olivo', category: 'Faldas', cost: 48, price: 189 },
  { name: 'Falda Midi Plisada', category: 'Faldas', cost: 55, price: 219 },
  { name: 'Falda Denim A-Line', category: 'Faldas', cost: 46, price: 179 },
  { name: 'Falda Satin Bias Cut', category: 'Faldas', cost: 62, price: 239 },
  { name: 'Tenis Court Blanco', category: 'Calzado', cost: 120, price: 399 },
  { name: 'Tenis Retro Runner', category: 'Calzado', cost: 145, price: 489 },
  { name: 'Bota Chelsea Urbana', category: 'Calzado', cost: 175, price: 599 },
  { name: 'Sandalia Slide Minimal', category: 'Calzado', cost: 55, price: 199 },
  { name: 'Tenis Canvas Low', category: 'Calzado', cost: 88, price: 329 },
  { name: 'Bolsa Crossbody Nylon', category: 'Bolsas', cost: 48, price: 189 },
  { name: 'Tote Bag Everyday', category: 'Bolsas', cost: 32, price: 129 },
  { name: 'Bolsa Mini Shoulder', category: 'Bolsas', cost: 58, price: 229 },
  { name: 'Mochila City Utility', category: 'Bolsas', cost: 85, price: 319 },
];

const sizesByCategory: Record<string, string[]> = {
  Pantalones: ['28', '30', '32', '34'],
  Playeras: ['S', 'M', 'L', 'XL'],
  Sudaderas: ['S', 'M', 'L', 'XL'],
  Accesorios: ['Unitalla'],
  Chamarras: ['S', 'M', 'L', 'XL'],
  Vestidos: ['S', 'M', 'L'],
  Faldas: ['S', 'M', 'L'],
  Calzado: ['25', '26', '27', '28'],
  Bolsas: ['Unitalla'],
};

const colors = ['Negro', 'Arena', 'Olivo', 'Índigo', 'Crudo', 'Gris'];

function imageUrl(index: number) {
  return `https://images.unsplash.com/${photoIds[index % photoIds.length]}?auto=format&fit=crop&w=800&q=80`;
}

async function main() {
  const passwordHash = await bcrypt.hash('Demo123!', 10);
  const business = await db.business.upsert({
    where: { id: 'american-outfit' },
    update: {},
    create: { id: 'american-outfit', name: 'American Outfit / Sucursal Centro' },
  });
  const second = await db.business.upsert({
    where: { id: 'demo-norte' },
    update: {},
    create: { id: 'demo-norte', name: 'American Outfit / Sucursal Norte' },
  });

  const admin = await db.user.upsert({
    where: { email: 'admin@americanoutfit.local' },
    update: {},
    create: { email: 'admin@americanoutfit.local', name: 'Admin Demo', passwordHash },
  });
  const seller = await db.user.upsert({
    where: { email: 'vendedor@americanoutfit.local' },
    update: {},
    create: { email: 'vendedor@americanoutfit.local', name: 'Vendedor Demo', passwordHash },
  });
  const inventory = await db.user.upsert({
    where: { email: 'inventario@americanoutfit.local' },
    update: {},
    create: { email: 'inventario@americanoutfit.local', name: 'Inventario Demo', passwordHash },
  });

  await db.membership.upsert({ where: { userId_businessId: { userId: admin.id, businessId: business.id } }, update: {}, create: { userId: admin.id, businessId: business.id, role: Role.ADMIN, canCancelSales: true } });
  await db.membership.upsert({ where: { userId_businessId: { userId: seller.id, businessId: business.id } }, update: {}, create: { userId: seller.id, businessId: business.id, role: Role.SELLER, canCancelSales: true } });
  await db.membership.upsert({ where: { userId_businessId: { userId: inventory.id, businessId: business.id } }, update: {}, create: { userId: inventory.id, businessId: business.id, role: Role.INVENTORY_MANAGER } });
  await db.membership.upsert({ where: { userId_businessId: { userId: admin.id, businessId: second.id } }, update: {}, create: { userId: admin.id, businessId: second.id, role: Role.ADMIN, canCancelSales: true } });

  const categoryRecords = new Map<string, { id: string }>();
  for (const name of categories) {
    const category = await db.category.upsert({
      where: { businessId_name: { businessId: business.id, name } },
      update: {},
      create: { businessId: business.id, name },
      select: { id: true },
    });
    categoryRecords.set(name, category);
  }

  for (const [index, item] of catalog.entries()) {
    const skuBase = index === 0 ? 'AO-0001' : `AO-${String(1001 + index).padStart(4, '0')}`;
    const category = categoryRecords.get(item.category)!;
    const productId = index === 0 ? 'ao-product-1' : `ao-demo-product-${String(index + 1).padStart(3, '0')}`;
    const product = await db.product.upsert({
      where: { id: productId },
      update: { name: item.name, categoryId: category.id, location: index % 3 === 0 ? 'Rack principal' : index % 3 === 1 ? 'Mesa central' : 'Pared lateral', photoPath: imageUrl(index) },
      create: {
        id: productId,
        businessId: business.id,
        name: item.name,
        categoryId: category.id,
        location: index % 3 === 0 ? 'Rack principal' : index % 3 === 1 ? 'Mesa central' : 'Pared lateral',
        photoPath: imageUrl(index),
      },
      select: { id: true },
    });

    const sizes = sizesByCategory[item.category];
    const variantCount = index < 30 ? 3 : 1;
    for (let variantIndex = 0; variantIndex < variantCount; variantIndex += 1) {
      const sku = index === 0 && variantIndex === 0 ? 'AO-0001' : `${skuBase}-${variantIndex + 1}`;
      const size = sizes[(index + variantIndex) % sizes.length];
      const color = item.category === 'Accesorios' || item.category === 'Bolsas'
        ? colors[(index + variantIndex) % colors.length]
        : colors[(index * 2 + variantIndex) % colors.length];
      const stock = index === 0 && variantIndex === 0
        ? 1
        : index % 13 === 0 && variantIndex === 0
          ? 0
          : index % 7 === 0 && variantIndex === 0
            ? 2
            : 4 + ((index * 3 + variantIndex * 5) % 19);
      const promoPrice = index % 8 === 0 ? Math.round(item.price * 0.85 * 100) / 100 : null;
      await db.productVariant.upsert({
        where: { businessId_sku: { businessId: business.id, sku } },
        update: {
          productId: product.id,
          size: item.category === 'Accesorios' || item.category === 'Bolsas' ? null : size,
          color,
          cost: item.cost,
          price: item.price,
          promoPrice,
          lowStockThreshold: 3,
          active: true,
        },
        create: {
          businessId: business.id,
          productId: product.id,
          sku,
          barcode: `750${String(100000000 + index * 10 + variantIndex).padStart(9, '0')}`,
          size: item.category === 'Accesorios' || item.category === 'Bolsas' ? null : size,
          color,
          cost: item.cost,
          price: item.price,
          promoPrice,
          stock,
          lowStockThreshold: 3,
        },
      });
    }
  }

  console.log(`Seed listo: ${catalog.length} productos y al menos ${catalog.length + 60} variantes en ${business.name}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
