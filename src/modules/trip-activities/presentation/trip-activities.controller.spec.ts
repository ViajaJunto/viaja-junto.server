import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TripActivitiesService } from '../application/trip-activities.service.js';
import { TripActivitiesController } from './trip-activities.controller.js';

/**
 * The controller is a thin HTTP boundary: these specs assert that every route
 * hands the request to the service untouched. The behaviour itself is covered
 * by trip-activities.service.spec.ts.
 */
describe('TripActivitiesController', () => {
  const id = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'ana@example.com',
  };

  let service: Record<keyof TripActivitiesService, ReturnType<typeof vi.fn>>;
  let controller: TripActivitiesController;

  beforeEach(() => {
    service = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    controller = new TripActivitiesController(
      service as unknown as TripActivitiesService,
    );
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
      tripDestinationId: '55555555-5555-4555-8555-555555555555',
      activityCatalogId: '66666666-6666-4666-8666-666666666666',
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
