import { randomInt } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  generateInviteCode,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  INVITE_CODE_PATTERN,
  normalizeInviteCode,
} from './invite-code.js';

describe('generateInviteCode', () => {
  it('builds a code of the documented length from the safe alphabet', () => {
    const code = generateInviteCode(randomInt);

    expect(code).toHaveLength(INVITE_CODE_LENGTH);
    expect([...code].every((char) => INVITE_CODE_ALPHABET.includes(char))).toBe(
      true,
    );
    expect(INVITE_CODE_PATTERN.test(code)).toBe(true);
  });

  it('draws every character from the random source', () => {
    const draws: number[] = [];
    const code = generateInviteCode((max) => {
      draws.push(max);
      return 0;
    });

    expect(draws).toEqual(
      Array(INVITE_CODE_LENGTH).fill(INVITE_CODE_ALPHABET.length),
    );
    expect(code).toBe(INVITE_CODE_ALPHABET[0].repeat(INVITE_CODE_LENGTH));
  });

  it('never uses look-alike characters', () => {
    expect(INVITE_CODE_ALPHABET).not.toMatch(/[ILO01]/);
  });

  it('produces different codes', () => {
    const codes = new Set(
      Array.from({ length: 200 }, () => generateInviteCode(randomInt)),
    );

    expect(codes.size).toBe(200);
  });
});

describe('INVITE_CODE_PATTERN', () => {
  it.each(['K7M2QX9P', 'k7m2qx9p'])('accepts %s', (code) => {
    expect(INVITE_CODE_PATTERN.test(code)).toBe(true);
  });

  it.each(['K7M2QX9', 'K7M2QX9PP', 'K7M2QX0P', 'K7M2-X9P', ''])(
    'rejects %j',
    (code) => {
      expect(INVITE_CODE_PATTERN.test(code)).toBe(false);
    },
  );
});

describe('normalizeInviteCode', () => {
  it('trims and upper-cases', () => {
    expect(normalizeInviteCode('  k7m2qx9p\n')).toBe('K7M2QX9P');
  });
});
