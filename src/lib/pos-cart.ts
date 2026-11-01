export type CartItem = { id: string; stock: number; price: number | string; promoPrice?: number | string | null; quantity: number };

export const effectivePrice = (item: CartItem) => Number(item.promoPrice ?? item.price);
export function addToCart<T extends CartItem>(cart: T[], item: T): T[] {
  const current = cart.find((line) => line.id === item.id);
  if (current) return cart.map((line) => line.id === item.id ? { ...line, quantity: Math.min(Number(line.stock), line.quantity + 1) } : line);
  return Number(item.stock) > 0 ? [...cart, { ...item, quantity: 1 }] : cart;
}
export function changeCartQuantity<T extends CartItem>(cart: T[], id: string, amount: number): T[] {
  return cart.map((item) => item.id === id ? { ...item, quantity: Math.max(0, Math.min(Number(item.stock), item.quantity + amount)) } : item).filter((item) => item.quantity > 0);
}
export const cartTotal = (cart: CartItem[]) => cart.reduce((sum, item) => sum + effectivePrice(item) * item.quantity, 0);
export const cartUnits = (cart: CartItem[]) => cart.reduce((sum, item) => sum + item.quantity, 0);
