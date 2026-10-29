import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlacesService } from '../application/places.service.js';
import { PlacesController } from './places.controller.js';

describe('PlacesController', () => {
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'a@example.com',
  };

  let service: Record<
    'search' | 'importActivity' | 'importDestination',
    ReturnType<typeof vi.fn>
  >;
  let controller: PlacesController;

  beforeEach(() => {
    service = {
      search: vi.fn(),
      importActivity: vi.fn(),
      importDestination: vi.fn(),
    };
    controller = new PlacesController(service as unknown as PlacesService);
  });

  it('forwards the search query and the caller', () => {
    const query = { q: 'louvre', limit: 5 };

    controller.search(query, user);

    expect(service.search).toHaveBeenCalledWith(query, user);
  });

  it('imports an activity by external id', () => {
    controller.importActivity({ externalId: 'osm:node:1' }, user);

    expect(service.importActivity).toHaveBeenCalledWith('osm:node:1', user);
  });

  it('imports a destination by external id', () => {
    controller.importDestination({ externalId: 'osm:node:1' }, user);

    expect(service.importDestination).toHaveBeenCalledWith('osm:node:1', user);
  });
});
