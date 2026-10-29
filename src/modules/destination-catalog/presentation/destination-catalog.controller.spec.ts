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
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'ana@example.com',
  };

  let service: Record<
    keyof DestinationCatalogService,
    ReturnType<typeof vi.fn>
  >;
  let controller: DestinationCatalogController;

  beforeEach(() => {
    service = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      findTop: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      updatePhoto: vi.fn(),
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

    expect(controller.findAll({})).toBe(page);
  });

  it('hands the uploaded photo to the service', () => {
    const file = {
      buffer: Buffer.from('img'),
      mimetype: 'image/png',
    };

    controller.updatePhoto(id, file, user);

    expect(service.updatePhoto).toHaveBeenCalledWith(id, file, user);
  });

  it('asks for the top destinations with the requested limit', () => {
    controller.findTop({ limit: 5 });

    expect(service.findTop).toHaveBeenCalledWith(5);
  });
});
