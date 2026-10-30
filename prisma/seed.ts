import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
const db = new PrismaClient();
async function main() {
 const passwordHash = await bcrypt.hash('Demo123!', 10);
 const business = await db.business.upsert({where:{id:'american-outfit'},update:{},create:{id:'american-outfit',name:'American Outfit / Sucursal Centro'}});
 const second = await db.business.upsert({where:{id:'demo-norte'},update:{},create:{id:'demo-norte',name:'American Outfit / Sucursal Norte'}});
 const admin = await db.user.upsert({where:{email:'admin@americanoutfit.local'},update:{},create:{email:'admin@americanoutfit.local',name:'Admin Demo',passwordHash}});
 const seller = await db.user.upsert({where:{email:'vendedor@americanoutfit.local'},update:{},create:{email:'vendedor@americanoutfit.local',name:'Vendedor Demo',passwordHash}});
 const inventory = await db.user.upsert({where:{email:'inventario@americanoutfit.local'},update:{},create:{email:'inventario@americanoutfit.local',name:'Inventario Demo',passwordHash}});
 await db.membership.upsert({where:{userId_businessId:{userId:admin.id,businessId:business.id}},update:{},create:{userId:admin.id,businessId:business.id,role:Role.ADMIN,canCancelSales:true}});
 await db.membership.upsert({where:{userId_businessId:{userId:seller.id,businessId:business.id}},update:{},create:{userId:seller.id,businessId:business.id,role:Role.SELLER,canCancelSales:true}});
 await db.membership.upsert({where:{userId_businessId:{userId:inventory.id,businessId:business.id}},update:{},create:{userId:inventory.id,businessId:business.id,role:Role.INVENTORY_MANAGER}});
 await db.membership.upsert({where:{userId_businessId:{userId:admin.id,businessId:second.id}},update:{},create:{userId:admin.id,businessId:second.id,role:Role.ADMIN,canCancelSales:true}});
 const category = await db.category.upsert({where:{businessId_name:{businessId:business.id,name:'Pantalones'}},update:{},create:{businessId:business.id,name:'Pantalones'}});
 for (const name of ['Playeras','Sudaderas','Accesorios']) await db.category.upsert({where:{businessId_name:{businessId:business.id,name}},update:{},create:{businessId:business.id,name}});
 const product = await db.product.upsert({where:{id:'ao-product-1'},update:{},create:{id:'ao-product-1',businessId:business.id,name:'Pantalon jogger cargo',categoryId:category.id,location:'Piso 1'}});
 await db.productVariant.upsert({where:{businessId_sku:{businessId:business.id,sku:'AO-0001'}},update:{},create:{businessId:business.id,productId:product.id,sku:'AO-0001',size:'M',color:'Negro',cost:35,price:150,stock:1,lowStockThreshold:1}});
}
main().finally(()=>db.$disconnect());
