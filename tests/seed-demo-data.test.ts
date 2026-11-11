import { describe, expect, it } from 'vitest';
import { businesses, DATABASE, ean13, EXPECTED_HOST, EXPECTED_USER, productName, stableId, targetConfiguration, validEan13, VARIANTS_PER_BUSINESS } from '../prisma/seed-demo-data';

describe('DEV-DATA-01 deterministic demo data', () => {
  it('covers every giro with the required special mappings and deterministic meaningful names', () => {
    expect(businesses.map(({ giro }) => giro)).toEqual(['ROPA', 'PAPELERIA', 'ABARROTES', 'FERRETERIA', 'BELLEZA', 'HOGAR', 'ELECTRONICA', 'SERVICIOS', 'OTRO']);
    expect(productName(businesses[0], 0)).toContain('Playera');
    expect(productName(businesses[7], 0)).toContain('Diagnóstico');
    expect(productName(businesses[8], 0)).toContain('Bistec');
    expect(productName(businesses[0], 123)).toBe(productName(businesses[0], 123));
    expect(new Set(businesses.map((business, index) => stableId('product', index, 1))).size).toBe(9);
    expect(VARIANTS_PER_BUSINESS).toBe(12_000);
  });

  it('calculates valid unique EAN-13 check digits', () => {
    const codes = businesses.map((_, index) => ean13(`${index + 1}00000000001`));
    expect(codes.every(validEan13)).toBe(true);
    expect(new Set(codes).size).toBe(codes.length);
    expect(validEan13(`${codes[0].slice(0, 12)}${(Number(codes[0][12]) + 1) % 10}`)).toBe(false);
  });

  it('accepts only the literal staging identity', () => {
    expect(targetConfiguration(`postgresql://${EXPECTED_USER}:x@${EXPECTED_HOST}:5432/${DATABASE}`)).toBeInstanceOf(URL);
    for (const url of [undefined, `postgresql://${EXPECTED_USER}:x@${EXPECTED_HOST}:5432/lucem_staging_shadow`, `postgresql://wrong:x@${EXPECTED_HOST}:5432/${DATABASE}`, `postgresql://${EXPECTED_USER}:x@127.0.0.1:5432/${DATABASE}`, `postgresql://${EXPECTED_USER}:x@${EXPECTED_HOST}:5433/${DATABASE}`]) expect(() => targetConfiguration(url)).toThrow();
  });
});
