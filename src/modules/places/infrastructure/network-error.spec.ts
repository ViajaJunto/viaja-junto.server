import { describe, expect, it } from 'vitest';
import { causeOf } from './network-error.js';

describe('causeOf', () => {
  it('names the code of the underlying error', () => {
    expect(
      causeOf(
        new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } }),
      ),
    ).toBe(' (ECONNREFUSED)');
  });

  it('lists the distinct codes of every address tried', () => {
    const cause = {
      errors: [
        { code: 'ETIMEDOUT' },
        { code: 'ENETUNREACH' },
        { code: 'ETIMEDOUT' },
      ],
    };

    expect(causeOf(new TypeError('fetch failed', { cause }))).toBe(
      ' (ETIMEDOUT, ENETUNREACH)',
    );
  });

  it.each([new Error('plain'), undefined, null, { cause: {} }])(
    'is empty when there is no code (%#)',
    (error) => {
      expect(causeOf(error)).toBe('');
    },
  );
});
