export const money = (value: number | string) => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(value));
export const numberValue = (value: unknown) => { const n=Number(value); return Number.isFinite(n)&&n>=0?n:null; };
