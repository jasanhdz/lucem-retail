import { BusinessGiro } from '@prisma/client';

export const DATABASE = 'lucem_staging';
export const EXPECTED_HOST = '172.19.0.3';
export const EXPECTED_USER = 'lucem_staging';
export const PRODUCT_COUNT = 10_000;
export const BATCH_SIZE = 500;
export const VARIANTS_PER_BUSINESS = 12_000;
export const businesses: Array<{ id: string; name: string; giro: BusinessGiro; nouns: string[]; brands: string[]; categories: string[] }> = [
  { id: 'demo-business-ropa', name: 'Ropa Demo', giro: BusinessGiro.ROPA, nouns: ['Playera', 'Pantalón', 'Camisa', 'Sudadera', 'Vestido', 'Chamarra', 'Blusa', 'Falda'], brands: ['Luna Norte', 'Tela Viva', 'Casa Nopal'], categories: ['Básicos', 'Dama', 'Caballero', 'Accesorios'] },
  { id: 'demo-business-papeleria', name: 'Papelería Demo', giro: BusinessGiro.PAPELERIA, nouns: ['Cuaderno', 'Pluma', 'Carpeta', 'Marcador', 'Papel', 'Lápiz', 'Agenda', 'Tijeras'], brands: ['Punto Claro', 'Trazo', 'Aula Viva'], categories: ['Escritura', 'Papel', 'Organización', 'Escolar'] },
  { id: 'demo-business-abarrotes', name: 'Abarrotes Demo', giro: BusinessGiro.ABARROTES, nouns: ['Arroz', 'Frijol', 'Café', 'Aceite', 'Galletas', 'Pasta', 'Atún', 'Cereal'], brands: ['Buen Campo', 'Mesa Real', 'La Cosecha'], categories: ['Despensa', 'Bebidas', 'Limpieza', 'Botanas'] },
  { id: 'demo-business-ferreteria', name: 'Ferretería Demo', giro: BusinessGiro.FERRETERIA, nouns: ['Tornillo', 'Martillo', 'Pintura', 'Brocha', 'Candado', 'Cable', 'Pinza', 'Lámpara'], brands: ['Fuerza Uno', 'Taller Norte', 'Obra Firme'], categories: ['Herramienta', 'Fijación', 'Electricidad', 'Pintura'] },
  { id: 'demo-business-belleza', name: 'Belleza Demo', giro: BusinessGiro.BELLEZA, nouns: ['Shampoo', 'Crema', 'Labial', 'Cepillo', 'Perfume', 'Esmalte', 'Mascarilla', 'Jabón'], brands: ['Aura Botánica', 'Brillo Mío', 'Piel Serena'], categories: ['Cabello', 'Cuidado facial', 'Maquillaje', 'Fragancias'] },
  { id: 'demo-business-hogar', name: 'Hogar Demo', giro: BusinessGiro.HOGAR, nouns: ['Vaso', 'Sartén', 'Toalla', 'Cojín', 'Cortina', 'Jarra', 'Cesta', 'Mantel'], brands: ['Patio Sur', 'Nido Cálido', 'Casa Marea'], categories: ['Cocina', 'Textiles', 'Decoración', 'Organización'] },
  { id: 'demo-business-electronica', name: 'Electrónica Demo', giro: BusinessGiro.ELECTRONICA, nouns: ['Audífonos', 'Cable USB', 'Cargador', 'Bocina', 'Teclado', 'Mouse', 'Adaptador', 'Lámpara LED'], brands: ['Voltio', 'Nexa', 'Circuito Azul'], categories: ['Audio', 'Cómputo', 'Energía', 'Accesorios'] },
  { id: 'demo-business-servicios', name: 'Servicios Demo', giro: BusinessGiro.SERVICIOS, nouns: ['Diagnóstico', 'Instalación', 'Mantenimiento', 'Asesoría', 'Reparación', 'Ajuste', 'Limpieza', 'Configuración'], brands: ['Oficio Claro', 'Manos Expertas', 'Servicio Norte'], categories: ['Hogar', 'Tecnología', 'Atención', 'Mantenimiento'] },
  { id: 'demo-business-carniceria', name: 'Carnicería Demo', giro: BusinessGiro.OTRO, nouns: ['Bistec', 'Costilla', 'Carne molida', 'Chuleta', 'Falda', 'Chorizo', 'Milanesa', 'Diezmillo'], brands: ['Rancho Fresco', 'Corte Noble', 'Pradera Real'], categories: ['Res', 'Cerdo', 'Preparados', 'Aves'] },
];
export function stableId(kind: string, businessIndex: number, row: number) { return `demo-${kind}-${businessIndex + 1}-${String(row).padStart(6, '0')}`; }
export function ean13(base: string) {
  const digits = base.replace(/\D/g, '').padStart(12, '0').slice(-12).split('').map(Number);
  const sum = digits.reduce((total, digit, index) => total + digit * (index % 2 ? 3 : 1), 0);
  return `${digits.join('')}${(10 - (sum % 10)) % 10}`;
}
export function validEan13(code: string) { return /^\d{13}$/.test(code) && ean13(code.slice(0, 12)) === code; }
export function productName(spec: typeof businesses[number], n: number) {
  const descriptors = ['Clásico', 'Selecto', 'Diario', 'Premium', 'Compacto', 'Familiar', 'Artesanal', 'Resistente'];
  const uses = ['para uso diario', 'presentación práctica', 'línea esencial', 'calidad seleccionada', 'edición tradicional'];
  return `${spec.nouns[n % spec.nouns.length]} ${descriptors[Math.floor(n / 7) % descriptors.length]} ${spec.brands[Math.floor(n / 13) % spec.brands.length]} ${uses[Math.floor(n / 19) % uses.length]} ${String(n + 1).padStart(5, '0')}`;
}
export function targetConfiguration(value: string | undefined) {
  if (!value) throw new Error('DATABASE_URL requerido');
  const url = new URL(value);
  if (decodeURIComponent(url.pathname.slice(1)) !== DATABASE || decodeURIComponent(url.username) !== EXPECTED_USER || url.hostname !== EXPECTED_HOST || url.port !== '5432') throw new Error('Destino no coincide exactamente con el staging autorizado');
  return url;
}
