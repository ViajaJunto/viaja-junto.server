import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { UnconfiguredObjectStorage } from './unconfigured-object-storage.js';

describe('UnconfiguredObjectStorage', () => {
  const storage = new UnconfiguredObjectStorage();

  it('refuses uploads with a 503 that names the missing variable', async () => {
    const attempt = storage.put();

    await expect(attempt).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(storage.put()).rejects.toThrow(/S3_BUCKET/);
  });

  it('treats deletes as no-ops and owns no URL', async () => {
    await expect(storage.delete()).resolves.toBeUndefined();
    expect(storage.keyFromUrl()).toBeNull();
  });
});
