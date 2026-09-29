import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DestinationCatalogService } from '../application/destination-catalog.service.js';
import { DestinationCatalogController } from './destination-catalog.controller.js';

/**
 * The controller is a thin HTTP boundary: these specs assert that every route
 * hands the request to the service untouched. The behaviour itself is covered
 * by destination-catalog.service.spec.ts.
 */
describe('DestinationCatalogController', () => {
  const id = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

  let service: Record<
    keyof DestinationCatalogService,
    ReturnType<typeof vi.fn>
  >;
  let controller: DestinationCatalogController;

  beforeEach(() => {
    service = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    controller = new DestinationCatalogController(
      service as unknown as DestinationCatalogService,
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
    const dto = { name: 'Paris' };

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
