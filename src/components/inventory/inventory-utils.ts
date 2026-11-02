export function inventoryBalances(available: string, reserved: string) {
  const availableAmount = Number(available);
  const reservedAmount = Number(reserved);
  return { available: availableAmount.toString(), reserved: reservedAmount.toString(), physical: (availableAmount + reservedAmount).toString() };
}
