import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../domain/user.entity.js';
import type { UserRepository } from '../domain/user.repository.js';
import { UsersService } from './users.service.js';

const base: User = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Gustavo Fidelis',
  email: 'gustavo@exemplo.com',
  passwordHash: 'hashed-secret',
  createdAt: new Date('2026-03-14T18:22:05.000Z'),
};

const entity = (overrides: Partial<User> = {}): User => ({
  ...base,
  ...overrides,
});

type RepoMock = {
  [K in keyof UserRepository]: ReturnType<typeof vi.fn>;
};

describe('UsersService', () => {
  let repository: RepoMock;
  let service: UsersService;

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    service = new UsersService(repository as unknown as UserRepository);
  });

  describe('findAll', () => {
    it('turns page and limit into a skip/take window', async () => {
      repository.findAll.mockResolvedValue({ items: [], total: 0 });

      await service.findAll({ page: 3, limit: 15 });

      expect(repository.findAll).toHaveBeenCalledWith({ skip: 30, take: 15 });
    });

    it('falls back to the default window when the query is empty', async () => {
      repository.findAll.mockResolvedValue({ items: [], total: 0 });

      await service.findAll({});

      expect(repository.findAll).toHaveBeenCalledWith({ skip: 0, take: 20 });
    });

    it('wraps the page in the { data, meta } envelope', async () => {
      repository.findAll.mockResolvedValue({ items: [entity()], total: 41 });

      const result = await service.findAll({ page: 2, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 2,
        limit: 20,
        total: 41,
        totalPages: 3,
        hasNext: true,
        hasPrevious: true,
      });
    });
  });

  describe('findOne', () => {
    it('returns the mapped response', async () => {
      repository.findById.mockResolvedValue(entity());

      const result = await service.findOne(base.id);

      expect(result.id).toBe(base.id);
    });

    it('throws NotFoundException when the record does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne(base.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('forwards the payload to the repository', async () => {
      repository.create.mockResolvedValue(entity());

      await service.create({
        name: 'Gustavo Fidelis',
        email: 'gustavo@exemplo.com',
        password: 'umaSenhaForte123',
      });

      expect(repository.create).toHaveBeenCalledWith({
        name: 'Gustavo Fidelis',
        email: 'gustavo@exemplo.com',
        passwordHash: 'umaSenhaForte123',
      });
    });
  });

  describe('update', () => {
    it('updates an existing record', async () => {
      repository.findById.mockResolvedValue(entity());
      repository.update.mockResolvedValue(entity());

      await service.update(base.id, {});

      expect(repository.update).toHaveBeenCalledWith(base.id, {});
    });

    it('does not touch the repository when the record is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(base.id, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing record', async () => {
      repository.findById.mockResolvedValue(entity());
      repository.remove.mockResolvedValue(undefined);

      await service.remove(base.id);

      expect(repository.remove).toHaveBeenCalledWith(base.id);
    });

    it('does not delete when the record is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(base.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  it('never exposes the password hash', async () => {
    repository.findById.mockResolvedValue(entity());

    const result = await service.findOne(entity().id);

    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('password');
    expect(Object.keys(result).sort()).toEqual([
      'createdAt',
      'email',
      'id',
      'name',
    ]);
  });
});
