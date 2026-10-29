// Pure rules for trip invite codes. No framework and no ORM dependency.

/** No I, L, O, 0 or 1: nothing that can be misread when typed from a message. */
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 8;

/** Matches what `generateInviteCode` produces, ignoring case. */
export const INVITE_CODE_PATTERN = new RegExp(
  `^[${INVITE_CODE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`,
  'i',
);

/**
 * Builds a code of `INVITE_CODE_LENGTH` characters. `randomInt(max)` must
 * return an integer in `[0, max)`; callers pass a cryptographic source.
 */
export function generateInviteCode(randomInt: (max: number) => number): string {
  return Array.from(
    { length: INVITE_CODE_LENGTH },
    () => INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)],
  ).join('');
}

/** Codes are case-insensitive and often pasted with stray spaces. */
export function normalizeInviteCode(input: string): string {
  return input.trim().toUpperCase();
}
