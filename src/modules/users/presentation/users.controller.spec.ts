import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsersService } from '../application/users.service.js';
import { UsersController } from './users.controller.js';

/**
 * The controller is a thin HTTP boundary: these specs assert that every route
 * hands the request to the service untouched. The behaviour itself is covered
 * by users.service.spec.ts.
 */
describe('UsersController', () => {
  const id = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'ana@example.com',
  };

  let service: Record<keyof UsersService, ReturnType<typeof vi.fn>>;
  let controller: UsersController;

  beforeEach(() => {
    service = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      findOrCreateFromGoogle: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    controller = new UsersController(service as unknown as UsersService);
  });

  it('passes the pagination query straight through', () => {
    controller.findAll({ page: 2, limit: 10 });

    expect(service.findAll).toHaveBeenCalledWith({ page: 2, limit: 10 });
  });

  it('passes an empty query through so the service applies the defaults', () => {
    controller.findAll({});

    expect(service.findAll).toHaveBeenCalledWith({});
  });

  it('forwards the id on findOne', () => {
    controller.findOne(id);

    expect(service.findOne).toHaveBeenCalledWith(id);
  });

  it('forwards id and body on update', () => {
    controller.update(id, {}, user);

    expect(service.update).toHaveBeenCalledWith(id, {}, user);
  });

  it('forwards the id on remove', () => {
    controller.remove(id, user);

    expect(service.remove).toHaveBeenCalledWith(id, user);
  });

  it('returns whatever the service returns', () => {
    const page = { data: [], meta: {} };
    service.findAll.mockReturnValue(page);

    expect(controller.findAll({})).toBe(page);
  });
});
