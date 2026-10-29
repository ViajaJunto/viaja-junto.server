import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { ActivityCatalogService } from '../../activity-catalog/application/activity-catalog.service.js';
import { ActivityCatalogResponseDto } from '../../activity-catalog/application/dto/activity-catalog-response.dto.js';
import { CatalogAccessService } from '../../catalog-access/application/catalog-access.service.js';
import { DestinationCatalogService } from '../../destination-catalog/application/destination-catalog.service.js';
import { DestinationCatalogResponseDto } from '../../destination-catalog/application/dto/destination-catalog-response.dto.js';
import {
  inferActivityType,
  inferDestinationCategory,
} from '../domain/place-mapping.js';
import {
  PlacesProvider,
  PlacesProviderError,
  type ExternalPlace,
} from '../domain/places.provider.js';
import {
  PlaceResponseDto,
  PlaceSearchResponseDto,
} from './dto/place-response.dto.js';
import type { SearchPlacesQueryDto } from './dto/search-places-query.dto.js';

/** OpenStreetMap's licence requires this credit wherever its data is shown. */
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors';

/**
 * Finds places in an external provider and imports them into the shared
 * catalogs. Everything here is admin-only, like the catalogs themselves.
 */
@Injectable()
export class PlacesService {
  constructor(
    private readonly provider: PlacesProvider,
    private readonly access: CatalogAccessService,
    private readonly activities: ActivityCatalogService,
    private readonly destinations: DestinationCatalogService,
  ) {}

  async search(
    query: SearchPlacesQueryDto,
    user: AuthenticatedUser,
  ): Promise<PlaceSearchResponseDto> {
    await this.access.assertAdmin(user.id);
    const places = await this.callProvider(() =>
      this.provider.search(query.q, query.limit),
    );

    const ids = places.map((place) => place.externalId);
    const [activityIds, destinationIds] = await Promise.all([
      this.activities.findImported(ids),
      this.destinations.findImported(ids),
    ]);
    const importedAsActivity = new Set(activityIds);
    const importedAsDestination = new Set(destinationIds);

    return {
      attribution: OSM_ATTRIBUTION,
      results: places.map((place) =>
        PlaceResponseDto.from(
          place,
          {
            activityType: inferActivityType(place),
            destinationCategory: inferDestinationCategory(place),
          },
          {
            activity: importedAsActivity.has(place.externalId),
            destination: importedAsDestination.has(place.externalId),
          },
        ),
      ),
    };
  }

  async importActivity(
    externalId: string,
    user: AuthenticatedUser,
  ): Promise<ActivityCatalogResponseDto> {
    await this.access.assertAdmin(user.id);
    const place = await this.findPlace(externalId);
    const destinationCatalogId = await this.destinations.findIdByCity(
      place.city,
      place.country,
    );

    return this.activities.importPlace(
      {
        externalId,
        name: place.name,
        type: inferActivityType(place),
        location: place.displayName,
        city: place.city,
        country: place.country,
        latitude: place.latitude,
        longitude: place.longitude,
        source: 'OSM',
        destinationCatalogId,
      },
      user,
    );
  }

  async importDestination(
    externalId: string,
    user: AuthenticatedUser,
  ): Promise<DestinationCatalogResponseDto> {
    await this.access.assertAdmin(user.id);
    const place = await this.findPlace(externalId);

    return this.destinations.importPlace(
      {
        externalId,
        name: place.name,
        country: place.country,
        countryCode: place.countryCode,
        category: inferDestinationCategory(place),
        latitude: place.latitude,
        longitude: place.longitude,
      },
      user,
    );
  }

  /** The place, fetched again from the provider: only the id comes from the client. */
  private async findPlace(externalId: string): Promise<ExternalPlace> {
    const place = await this.callProvider(() =>
      this.provider.lookup(externalId),
    );

    if (!place) {
      throw new NotFoundException(`Place "${externalId}" was not found`);
    }

    return place;
  }

  /** Turns what can go wrong with the provider into the HTTP answer it deserves. */
  private async callProvider<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (error) {
      if (!(error instanceof PlacesProviderError)) throw error;

      switch (error.failure) {
        case 'timeout':
          throw new GatewayTimeoutException(error.message);
        case 'rate_limited':
          throw new ServiceUnavailableException(error.message);
        default:
          throw new BadGatewayException(error.message);
      }
    }
  }
}
