import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TripsService } from '../application/trips.service.js';
import { TripsController } from './trips.controller.js';

/**
 * The controller is a thin HTTP boundary: these specs assert that every route
 * hands the request to the service untouched. The behaviour itself is covered
 * by trips.service.spec.ts.
 */
describe('TripsController', () => {
  const id = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'ana@example.com',
  };

  let service: Record<keyof TripsService, ReturnType<typeof vi.fn>>;
  let controller: TripsController;

  beforeEach(() => {
    service = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    controller = new TripsController(service as unknown as TripsService);
  });

  it('passes the pagination query straight through', () => {
    controller.findAll({ page: 2, limit: 10 }, user);

    expect(service.findAll).toHaveBeenCalledWith({ page: 2, limit: 10 }, user);
  });

  it('passes an empty query through so the service applies the defaults', () => {
    controller.findAll({}, user);

    expect(service.findAll).toHaveBeenCalledWith({}, user);
  });

  it('forwards the id on findOne', () => {
    controller.findOne(id, user);

    expect(service.findOne).toHaveBeenCalledWith(id, user);
  });

  it('forwards the body on create', () => {
    const dto = {
      name: 'Eurotrip 2026',
    };

    controller.create(dto, user);

    expect(service.create).toHaveBeenCalledWith(dto, user);
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

    expect(controller.findAll({}, user)).toBe(page);
  });
});
