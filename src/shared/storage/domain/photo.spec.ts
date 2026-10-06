import { describe, expect, it } from 'vitest';
import { buildPhotoKey, isPhotoContentType } from './photo.js';

describe('photo helpers', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', (type) => {
    expect(isPhotoContentType(type)).toBe(true);
  });

  it.each(['image/gif', 'application/pdf', 'toString', ''])(
    'rejects %s',
    (type) => {
      expect(isPhotoContentType(type)).toBe(false);
    },
  );

  it('builds a unique key under the owner folder with the right extension', () => {
    const first = buildPhotoKey('destinations', 'abc', 'image/webp');
    const second = buildPhotoKey('destinations', 'abc', 'image/webp');

    expect(first).toMatch(/^destinations\/abc\/[0-9a-f-]{36}\.webp$/);
    expect(first).not.toBe(second);
  });
});
