import { describe, expect, it } from 'vitest';
import { TtlCache } from './ttl-cache.js';

describe('TtlCache', () => {
  it('returns what was stored until it expires', () => {
    let now = 1_000;
    const cache = new TtlCache<string>(100, 10, () => now);
    cache.set('a', 'value');

    expect(cache.get('a')).toBe('value');
    now += 99;
    expect(cache.get('a')).toBe('value');
    now += 1;
    expect(cache.get('a')).toBeUndefined();
  });

  it('misses a key it never saw', () => {
    expect(new TtlCache<string>(100, 10).get('nope')).toBeUndefined();
  });

  it('keeps a stored null, which means "known to be absent"', () => {
    const cache = new TtlCache<string | null>(100, 10);
    cache.set('gone', null);

    expect(cache.get('gone')).toBeNull();
  });

  it('drops the oldest entry when full', () => {
    const cache = new TtlCache<number>(1000, 2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('treats a rewritten key as the newest, with a fresh lifetime', () => {
    let now = 0;
    const cache = new TtlCache<number>(100, 2, () => now);
    cache.set('a', 1);
    cache.set('b', 2);
    now = 50;
    cache.set('a', 10);
    cache.set('c', 3);

    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(10);
    now = 149;
    expect(cache.get('a')).toBe(10);
  });
});
