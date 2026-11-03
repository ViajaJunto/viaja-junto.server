import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityCatalogService } from '../../activity-catalog/application/activity-catalog.service.js';
import type { DestinationCatalogService } from '../../destination-catalog/application/destination-catalog.service.js';
import { PlacesProviderError } from '../domain/places.provider.js';
import type { PointsOfInterestProvider } from '../domain/points-of-interest.provider.js';
import {
  ActivityDiscoveryService,
  SEARCH_RADIUS_METERS,
} from './activity-discovery.service.js';

const paris = {
  id: 'dest-paris',
  name: 'Paris',
  country: 'França',
  latitude: 48.85,
  longitude: 2.35,
};
const louvre = {
  externalId: 'osm:node:1',
  name: 'Louvre',
  displayName: 'Louvre, Paris',
  kind: 'tourism',
  subtype: 'museum',
  city: null,
  country: null,
  countryCode: null,
  latitude: 48.86,
  longitude: 2.33,
};

const page = (names: string[]) => ({
  data: names.map((name) => ({ id: name, name })),
  meta: { total: names.length },
});

describe('ActivityDiscoveryService', () => {
  let provider: { findNear: ReturnType<typeof vi.fn> };
  let activities: {
    findAll: ReturnType<typeof vi.fn>;
    importDiscovered: ReturnType<typeof vi.fn>;
  };
  let destinations: { findOne: ReturnType<typeof vi.fn> };
  let service: ActivityDiscoveryService;

  beforeEach(() => {
    provider = { findNear: vi.fn().mockResolvedValue([louvre]) };
    activities = {
      findAll: vi.fn().mockResolvedValue(page([])),
      importDiscovered: vi.fn().mockResolvedValue(1),
    };
    destinations = { findOne: vi.fn().mockResolvedValue(paris) };
    service = new ActivityDiscoveryService(
      provider as unknown as PointsOfInterestProvider,
      activities as unknown as ActivityCatalogService,
      destinations as unknown as DestinationCatalogService,
    );
  });

  it('answers from the catalog, without calling OpenStreetMap, when it has enough', async () => {
    activities.findAll.mockResolvedValue(page(['a', 'b']));

    const result = await service.findForDestination('dest-paris', {
      type: 'TOUR',
      limit: 2,
    });

    expect(provider.findNear).not.toHaveBeenCalled();
    expect(result).toMatchObject({ imported: 0 });
    expect(result.data).toHaveLength(2);
    expect(activities.findAll).toHaveBeenCalledWith({
      destinationId: 'dest-paris',
      type: 'TOUR',
      limit: 2,
      page: 1,
      sort: 'rating',
    });
  });

  it('looks around the destination when the catalog has too few, and stores what it finds', async () => {
    activities.findAll
      .mockResolvedValueOnce(page([]))
      .mockResolvedValueOnce(page(['Louvre']));

    const result = await service.findForDestination('dest-paris', {
      type: 'TOUR',
      limit: 5,
    });

    expect(provider.findNear).toHaveBeenCalledWith({
      latitude: 48.85,
      longitude: 2.35,
      radiusMeters: SEARCH_RADIUS_METERS.TOUR,
      category: 'TOUR',
      limit: 15,
    });
    expect(activities.importDiscovered).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          externalId: 'osm:node:1',
          type: 'TOUR',
          city: 'Paris',
          country: 'França',
          source: 'OSM',
          destinationCatalogId: 'dest-paris',
        }),
      ],
      'dest-paris',
    );
    expect(result).toMatchObject({
      imported: 1,
      attribution: '© OpenStreetMap contributors',
    });
    expect(result.data).toHaveLength(1);
  });

  it('does not search the same destination and type again soon', async () => {
    await service.findForDestination('dest-paris', { type: 'TOUR', limit: 5 });
    await service.findForDestination('dest-paris', { type: 'TOUR', limit: 5 });
    await service.findForDestination('dest-paris', { type: 'FOOD', limit: 5 });

    expect(provider.findNear).toHaveBeenCalledTimes(2);
  });

  it('searches a smaller area for restaurants and hotels', async () => {
    await service.findForDestination('dest-paris', { type: 'FOOD', limit: 5 });
    await service.findForDestination('dest-paris', {
      type: 'LODGING',
      limit: 5,
    });

    expect(provider.findNear.mock.calls.map(([s]) => s.radiusMeters)).toEqual([
      SEARCH_RADIUS_METERS.FOOD,
      SEARCH_RADIUS_METERS.LODGING,
    ]);
    expect(SEARCH_RADIUS_METERS.FOOD).toBeLessThan(SEARCH_RADIUS_METERS.TOUR);
  });

  it('writes the destination name as the city, whatever the place says', async () => {
    provider.findNear.mockResolvedValue([{ ...louvre, city: 'Londres' }]);

    await service.findForDestination('dest-paris', { type: 'TOUR', limit: 5 });

    expect(activities.importDiscovered).toHaveBeenCalledWith(
      [expect.objectContaining({ city: 'Paris' })],
      'dest-paris',
    );
  });

  it('searches again when a larger limit is asked for, but not for a smaller one', async () => {
    await service.findForDestination('dest-paris', { type: 'TOUR', limit: 5 });
    await service.findForDestination('dest-paris', { type: 'TOUR', limit: 3 });
    expect(provider.findNear).toHaveBeenCalledTimes(1);

    await service.findForDestination('dest-paris', { type: 'TOUR', limit: 10 });
    expect(provider.findNear).toHaveBeenCalledTimes(2);
  });

  it('only answers from the catalog when the destination has no coordinates', async () => {
    destinations.findOne.mockResolvedValue({
      ...paris,
      latitude: null,
      longitude: null,
    });

    await service.findForDestination('dest-paris', { type: 'TOUR', limit: 5 });

    expect(provider.findNear).not.toHaveBeenCalled();
  });

  it('keeps answering with what the catalog has when OpenStreetMap fails', async () => {
    activities.findAll.mockResolvedValue(page(['a']));
    provider.findNear.mockRejectedValue(
      new PlacesProviderError('unavailable', 'down'),
    );

    const result = await service.findForDestination('dest-paris', {
      type: 'TOUR',
      limit: 5,
    });

    expect(result).toMatchObject({ imported: 0 });
    expect(result.data).toHaveLength(1);
  });

  it('surfaces the failure as an HTTP error when the catalog has nothing to show', async () => {
    provider.findNear.mockRejectedValue(
      new PlacesProviderError('unavailable', 'down'),
    );

    await expect(
      service.findForDestination('dest-paris', { type: 'TOUR', limit: 5 }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('retries after a failure instead of remembering it as searched', async () => {
    provider.findNear.mockRejectedValueOnce(
      new PlacesProviderError('timeout', 'slow'),
    );
    await service
      .findForDestination('dest-paris', { type: 'TOUR', limit: 5 })
      .catch(() => undefined);

    await service.findForDestination('dest-paris', { type: 'TOUR', limit: 5 });

    expect(provider.findNear).toHaveBeenCalledTimes(2);
  });

  it('answers 404 for an unknown destination, before anything else', async () => {
    destinations.findOne.mockRejectedValue(new NotFoundException());

    await expect(
      service.findForDestination('nope', { type: 'TOUR', limit: 5 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(activities.findAll).not.toHaveBeenCalled();
  });
});
