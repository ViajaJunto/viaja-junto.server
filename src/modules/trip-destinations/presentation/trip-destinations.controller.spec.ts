import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TripDestinationsService } from '../application/trip-destinations.service.js';
import { TripDestinationsController } from './trip-destinations.controller.js';

/**
 * The controller is a thin HTTP boundary: these specs assert that every route
 * hands the request to the service untouched. The behaviour itself is covered
 * by trip-destinations.service.spec.ts.
 */
describe('TripDestinationsController', () => {
  const id = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

  let service: Record<keyof TripDestinationsService, ReturnType<typeof vi.fn>>;
  let controller: TripDestinationsController;

  beforeEach(() => {
    service = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    controller = new TripDestinationsController(
      service as unknown as TripDestinationsService,
    );
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
      tripId: '22222222-2222-4222-8222-222222222222',
      destinationCatalogId: '44444444-4444-4444-8444-444444444444',
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
