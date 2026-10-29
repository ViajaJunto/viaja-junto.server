import { describe, expect, it } from 'vitest';
import { escapeLike } from './like.js';

describe('escapeLike', () => {
  it.each([
    ['100%', '100\\%'],
    ['Fran_a', 'Fran\\_a'],
    ['a\\b', 'a\\\\b'],
    ['%_\\', '\\%\\_\\\\'],
  ])('escapes the wildcards of %j', (input, escaped) => {
    expect(escapeLike(input)).toBe(escaped);
  });

  it('leaves ordinary text, accents and spaces alone', () => {
    expect(escapeLike('São Paulo')).toBe('São Paulo');
  });
});
