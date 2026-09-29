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

  it('forwards the body on create', () => {
    const dto = {
      name: 'Eurotrip 2026',
      createdBy: '11111111-1111-4111-8111-111111111111',
    };

    controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('forwards id and body on update', () => {
    controller.update(id, {});

    expect(service.update).toHaveBeenCalledWith(id, {});
  });

  it('forwards the id on remove', () => {
    controller.remove(id);

    expect(service.remove).toHaveBeenCalledWith(id);
  });

  it('returns whatever the service returns', () => {
    const page = { data: [], meta: {} };
    service.findAll.mockReturnValue(page);

    expect(controller.findAll({})).toBe(page);
  });
});
