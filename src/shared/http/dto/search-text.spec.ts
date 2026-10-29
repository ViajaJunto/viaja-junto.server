import { plainToInstance } from 'class-transformer';
import { describe, expect, it } from 'vitest';
import { TrimmedText } from './search-text.js';

class Query {
  @TrimmedText()
  q?: unknown;
}

const parse = (q: unknown) => plainToInstance(Query, { q }).q;

describe('TrimmedText', () => {
  it('trims the value', () => {
    expect(parse('  paris ')).toBe('paris');
  });

  it.each(['', '   '])('treats %j as not provided', (blank) => {
    expect(parse(blank)).toBeUndefined();
  });

  it('leaves non-strings for the validators to reject', () => {
    expect(parse(5)).toBe(5);
    expect(parse(['a'])).toEqual(['a']);
  });
});
