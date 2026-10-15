import { ConflictException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsersService } from '../../users/application/users.service.js';
import { CatalogAccessService } from './catalog-access.service.js';

const userId = '11111111-1111-4111-8111-111111111111';

describe('CatalogAccessService', () => {
  let users: { getRole: ReturnType<typeof vi.fn> };
  let service: CatalogAccessService;

  beforeEach(() => {
    users = { getRole: vi.fn() };
    service = new CatalogAccessService(users as unknown as UsersService);
  });

  it('lets an administrator through', async () => {
    users.getRole.mockResolvedValue('ADMIN');

    await expect(service.assertAdmin(userId)).resolves.toBeUndefined();
    expect(users.getRole).toHaveBeenCalledWith(userId);
  });

  it('forbids a regular user', async () => {
    users.getRole.mockResolvedValue('USER');

    await expect(service.assertAdmin(userId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  describe('assertCanDelete', () => {
    it('lets an administrator delete an unused entry', async () => {
      users.getRole.mockResolvedValue('ADMIN');

      await expect(
        service.assertCanDelete(userId, () => Promise.resolve(0)),
      ).resolves.toBeUndefined();
    });

    it('refuses an entry that trips still use', async () => {
      users.getRole.mockResolvedValue('ADMIN');

      await expect(
        service.assertCanDelete(userId, () => Promise.resolve(2)),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('forbids a regular user without looking at the usages', async () => {
      users.getRole.mockResolvedValue('USER');
      const countUsages = vi.fn();

      await expect(
        service.assertCanDelete(userId, countUsages),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(countUsages).not.toHaveBeenCalled();
    });
  });
});
