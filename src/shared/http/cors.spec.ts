import { describe, expect, it } from 'vitest';
import { buildCorsOptions } from './cors.js';

describe('buildCorsOptions', () => {
  const options = buildCorsOptions(['http://localhost:5173']);

  it('allows only the configured origins', () => {
    expect(options.origin).toEqual(['http://localhost:5173']);
  });

  it('allows the Bearer header and JSON bodies, nothing else', () => {
    expect(options.allowedHeaders).toEqual(['Authorization', 'Content-Type']);
  });

  it('allows the methods the API uses', () => {
    expect(options.methods).toEqual([
      'GET',
      'POST',
      'PATCH',
      'PUT',
      'DELETE',
      'OPTIONS',
    ]);
  });

  it('does not enable credentials, since the API uses Bearer tokens', () => {
    expect(options.credentials).toBeUndefined();
  });
});
