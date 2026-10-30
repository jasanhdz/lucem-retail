import { describe, expect, it } from 'vitest';
import { money } from '@/lib/money';
describe('money',()=>{it('formats MXN with two decimals',()=>expect(money(150)).toContain('150.00'));});
