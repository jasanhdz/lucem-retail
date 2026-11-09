import { beforeEach, describe, expect, it } from 'vitest';
import { clearLoginFailures, isLoginRateLimited, recordLoginFailure } from '../src/lib/auth';

describe('login throttling', () => {
  beforeEach(() => {
    clearLoginFailures('first@example.test');
    clearLoginFailures('second@example.test');
    clearLoginFailures('oldest@example.test');
  });

  it('limits one normalized account key without affecting another account', () => {
    for (let attempt = 0; attempt < 5; attempt += 1) recordLoginFailure(' FIRST@example.test ');
    expect(isLoginRateLimited('first@example.test')).toBe(true);
    expect(isLoginRateLimited('second@example.test')).toBe(false);
  });

  it('expires the in-memory window and documents its single-process scope', () => {
    recordLoginFailure('first@example.test', 1000);
    expect(isLoginRateLimited('first@example.test', 1000 + 15 * 60 * 1000)).toBe(false);
  });

  it('bounds the number of distinct email keys retained in memory', () => {
    for (let attempt = 0; attempt < 5; attempt += 1) recordLoginFailure('oldest@example.test', 1000);
    for (let index = 0; index < 4096; index += 1) recordLoginFailure(`account-${index}@example.test`, 1000);
    expect(isLoginRateLimited('oldest@example.test', 1000)).toBe(false);
  });
});
