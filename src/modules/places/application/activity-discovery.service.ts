import { Injectable } from '@nestjs/common';
import { ActivityCatalogService } from '../../activity-catalog/application/activity-catalog.service.js';
import { DestinationCatalogService } from '../../destination-catalog/application/destination-catalog.service.js';
import {
  PointsOfInterestProvider,
  type PoiCategory,
} from '../domain/points-of-interest.provider.js';
import { TtlCache } from '../infrastructure/ttl-cache.js';
import { OSM_ATTRIBUTION } from './places.service.js';
import { callProvider } from './provider-errors.js';
import type { DestinationActivitiesQueryDto } from './dto/destination-activities-query.dto.js';
import type { DestinationActivitiesResponseDto } from './dto/destination-activities-response.dto.js';

/**
 * How far from the destination's coordinates each kind of place is looked
 * for. Restaurants and hotels are everywhere, so a wide search is too heavy
 * for the public servers and the nearest ones are the useful ones anyway.
 */
export const SEARCH_RADIUS_METERS: Record<PoiCategory, number> = {
  TOUR: 10_000,
  FOOD: 3_000,
  LODGING: 5_000,
};
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** What must be shown with places from each source. */
const GOOGLE_ATTRIBUTION = 'Powered by Google';

/** The credits the answer needs: Google for its places, OpenStreetMap for the ones imported from there. */
export function attributionFor(
  activities: { source: string | null }[],
): string {
  const sources = new Set(activities.map(({ source }) => source));
  const credits = [
    sources.has('GOOGLE') ? GOOGLE_ATTRIBUTION : null,
    sources.has('OSM') ? OSM_ATTRIBUTION : null,
  ].filter(Boolean);

  return credits.length > 0 ? credits.join(' · ') : GOOGLE_ATTRIBUTION;
}

/**
 * The activities of a destination: the catalog first and, only when it does
 * not have enough, Google Places. What is fetched is added to the
 * catalog, so the next request is answered from the database.
 */
@Injectable()
export class ActivityDiscoveryService {
  /** The limit already searched for a destination + type, so a small city does not hit Google Places on every request. */
  private readonly searched = new TtlCache<number>(ONE_DAY_MS, 1000);

  constructor(
    private readonly provider: PointsOfInterestProvider,
    private readonly activities: ActivityCatalogService,
    private readonly destinations: DestinationCatalogService,
  ) {}

  async findForDestination(
    destinationId: string,
    { type, limit }: DestinationActivitiesQueryDto,
  ): Promise<DestinationActivitiesResponseDto> {
    const destination = await this.destinations.findOne(destinationId);
    const fromCatalog = () =>
      this.activities.findAll({
        destinationId,
        type,
        limit,
        page: 1,
        sort: 'rating',
      });
    const answer = (
      page: Awaited<ReturnType<typeof fromCatalog>>,
      imported: number,
    ) => ({
      data: page.data,
      imported,
      attribution: attributionFor(page.data),
    });

    const known = await fromCatalog();
    const searchKey = `${destinationId}:${type}`;
    const hasCoordinates =
      destination.latitude !== null && destination.longitude !== null;

    if (
      known.meta.total >= limit ||
      !hasCoordinates ||
      (this.searched.get(searchKey) ?? 0) >= limit
    ) {
      return answer(known, 0);
    }

    let found: Awaited<ReturnType<PointsOfInterestProvider['findNear']>>;
    try {
      found = await callProvider(() =>
        this.provider.findNear({
          latitude: destination.latitude as number,
          longitude: destination.longitude as number,
          radiusMeters: SEARCH_RADIUS_METERS[type],
          category: type,
          limit,
        }),
      );
    } catch (error) {
      // The provider being down is not worth failing a request the catalog can answer.
      if (known.data.length > 0) return answer(known, 0);
      throw error;
    }

    const imported = await this.activities.importDiscovered(
      found.map((place) => ({
        externalId: place.externalId,
        name: place.name,
        type: type satisfies PoiCategory,
        location: place.displayName,
        // The destination is the city: the same spelling for every activity in it.
        city: destination.name,
        country: destination.country,
        latitude: place.latitude,
        longitude: place.longitude,
        source: place.source ?? 'OSM',
        googlePlaceId: place.googlePlaceId ?? null,
        photoUrl: place.photoUrl ?? null,
        destinationCatalogId: destinationId,
      })),
      destinationId,
    );
    this.searched.set(searchKey, limit);

    return answer(await fromCatalog(), imported);
  }
}
