import {
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  GatewayTimeoutException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityCatalogService } from '../../activity-catalog/application/activity-catalog.service.js';
import type { CatalogAccessService } from '../../catalog-access/application/catalog-access.service.js';
import type { DestinationCatalogService } from '../../destination-catalog/application/destination-catalog.service.js';
import {
  PlacesProviderError,
  type ExternalPlace,
  type PlacesProvider,
} from '../domain/places.provider.js';
import { OSM_ATTRIBUTION, PlacesService } from './places.service.js';

const admin = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'a@example.com',
};

const louvre: ExternalPlace = {
  externalId: 'osm:node:240109189',
  name: 'Musée du Louvre',
  displayName: 'Musée du Louvre, Paris, França',
  kind: 'tourism',
  subtype: 'museum',
  city: 'Paris',
  country: 'França',
  countryCode: 'FR',
  latitude: 48.86,
  longitude: 2.33,
};
const paris: ExternalPlace = {
  ...louvre,
  externalId: 'osm:relation:7444',
  name: 'Paris',
  kind: 'boundary',
  subtype: 'administrative',
};

describe('PlacesService', () => {
  let provider: {
    search: ReturnType<typeof vi.fn>;
    lookup: ReturnType<typeof vi.fn>;
  };
  let access: { assertAdmin: ReturnType<typeof vi.fn> };
  let activities: {
    findImported: ReturnType<typeof vi.fn>;
    importPlace: ReturnType<typeof vi.fn>;
  };
  let destinations: typeof activities & {
    findIdByCity: ReturnType<typeof vi.fn>;
  };
  let service: PlacesService;

  beforeEach(() => {
    provider = { search: vi.fn(), lookup: vi.fn() };
    access = { assertAdmin: vi.fn().mockResolvedValue(undefined) };
    activities = {
      findImported: vi.fn().mockResolvedValue([]),
      importPlace: vi.fn().mockResolvedValue({ id: 'a1' }),
    };
    destinations = {
      findImported: vi.fn().mockResolvedValue([]),
      importPlace: vi.fn().mockResolvedValue({ id: 'd1' }),
      findIdByCity: vi.fn().mockResolvedValue(null),
    };
    service = new PlacesService(
      provider as unknown as PlacesProvider,
      access as unknown as CatalogAccessService,
      activities as unknown as ActivityCatalogService,
      destinations as unknown as DestinationCatalogService,
    );
  });

  describe('search', () => {
    it('is for administrators only, and never calls the provider otherwise', async () => {
      access.assertAdmin.mockRejectedValue(new ForbiddenException());

      await expect(
        service.search({ q: 'louvre', limit: 5 }, admin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(provider.search).not.toHaveBeenCalled();
    });

    it('returns the places with the attribution and what an import would create', async () => {
      provider.search.mockResolvedValue([louvre, paris]);

      const result = await service.search({ q: 'louvre', limit: 5 }, admin);

      expect(provider.search).toHaveBeenCalledWith('louvre', 5);
      expect(result.attribution).toBe(OSM_ATTRIBUTION);
      expect(result.results[0]).toMatchObject({
        externalId: louvre.externalId,
        name: 'Musée du Louvre',
        suggestedActivityType: 'TOUR',
        suggestedDestinationCategory: 'CULTURAL',
      });
      expect(result.results[1]).toMatchObject({
        suggestedDestinationCategory: 'CITY',
      });
    });

    it('marks the places that are already in each catalog', async () => {
      provider.search.mockResolvedValue([louvre, paris]);
      activities.findImported.mockResolvedValue([louvre.externalId]);
      destinations.findImported.mockResolvedValue([paris.externalId]);

      const { results } = await service.search({ q: 'x', limit: 5 }, admin);

      expect(results.map((r) => r.inCatalog)).toEqual([
        { activity: true, destination: false },
        { activity: false, destination: true },
      ]);
      expect(activities.findImported).toHaveBeenCalledWith([
        louvre.externalId,
        paris.externalId,
      ]);
    });

    it('returns an empty list when nothing matches', async () => {
      provider.search.mockResolvedValue([]);

      await expect(
        service.search({ q: 'zzzzz', limit: 5 }, admin),
      ).resolves.toMatchObject({ results: [] });
    });

    it.each([
      ['timeout', GatewayTimeoutException],
      ['rate_limited', ServiceUnavailableException],
      ['unavailable', BadGatewayException],
    ] as const)(
      'maps a provider %s to the right HTTP error',
      async (failure, expected) => {
        provider.search.mockRejectedValue(
          new PlacesProviderError(failure, 'boom'),
        );

        await expect(
          service.search({ q: 'x', limit: 5 }, admin),
        ).rejects.toBeInstanceOf(expected);
      },
    );

    it('lets other errors through untouched, such as the 503 of a missing configuration', async () => {
      const notConfigured = new ServiceUnavailableException('not configured');
      provider.search.mockRejectedValue(notConfigured);

      await expect(service.search({ q: 'x', limit: 5 }, admin)).rejects.toBe(
        notConfigured,
      );
    });
  });

  describe('importActivity', () => {
    it('re-reads the place from the provider and imports it with the guessed type', async () => {
      provider.lookup.mockResolvedValue(louvre);

      await service.importActivity(louvre.externalId, admin);

      expect(provider.lookup).toHaveBeenCalledWith(louvre.externalId);
      expect(activities.importPlace).toHaveBeenCalledWith(
        {
          externalId: louvre.externalId,
          name: 'Musée du Louvre',
          type: 'TOUR',
          location: 'Musée du Louvre, Paris, França',
          city: 'Paris',
          country: 'França',
          latitude: 48.86,
          longitude: 2.33,
          source: 'OSM',
          destinationCatalogId: null,
        },
        admin,
      );
    });

    it('links the activity to the catalog destination of its city', async () => {
      provider.lookup.mockResolvedValue(louvre);
      destinations.findIdByCity.mockResolvedValue('dest-paris');

      await service.importActivity(louvre.externalId, admin);

      expect(destinations.findIdByCity).toHaveBeenCalledWith('Paris', 'França');
      expect(activities.importPlace).toHaveBeenCalledWith(
        expect.objectContaining({ destinationCatalogId: 'dest-paris' }),
        admin,
      );
    });

    it('answers 404 when the provider does not know the place', async () => {
      provider.lookup.mockResolvedValue(null);

      await expect(
        service.importActivity('osm:node:1', admin),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(activities.importPlace).not.toHaveBeenCalled();
    });

    it('is for administrators only', async () => {
      access.assertAdmin.mockRejectedValue(new ForbiddenException());

      await expect(
        service.importActivity(louvre.externalId, admin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(provider.lookup).not.toHaveBeenCalled();
    });

    it('lets the 409 of a duplicate through', async () => {
      provider.lookup.mockResolvedValue(louvre);
      activities.importPlace.mockRejectedValue(new ConflictException());

      await expect(
        service.importActivity(louvre.externalId, admin),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('importDestination', () => {
    it('imports the place with its country, ISO code and guessed category', async () => {
      provider.lookup.mockResolvedValue(paris);

      await service.importDestination(paris.externalId, admin);

      expect(destinations.importPlace).toHaveBeenCalledWith(
        {
          externalId: paris.externalId,
          name: 'Paris',
          country: 'França',
          countryCode: 'FR',
          category: 'CITY',
          latitude: 48.86,
          longitude: 2.33,
        },
        admin,
      );
    });

    it('answers 404 when the provider does not know the place', async () => {
      provider.lookup.mockResolvedValue(null);

      await expect(
        service.importDestination('osm:node:1', admin),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('maps a provider timeout to 504', async () => {
      provider.lookup.mockRejectedValue(
        new PlacesProviderError('timeout', 'slow'),
      );

      await expect(
        service.importDestination(paris.externalId, admin),
      ).rejects.toBeInstanceOf(GatewayTimeoutException);
    });
  });
});
