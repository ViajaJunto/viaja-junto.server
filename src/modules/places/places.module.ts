import { Logger, Module } from '@nestjs/common';
import { env } from '../../shared/config/env.js';
import { ActivityCatalogModule } from '../activity-catalog/activity-catalog.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CatalogAccessModule } from '../catalog-access/catalog-access.module.js';
import { DestinationCatalogModule } from '../destination-catalog/destination-catalog.module.js';
import { PlacesService } from './application/places.service.js';
import { PlacesProvider } from './domain/places.provider.js';
import { NominatimProvider } from './infrastructure/nominatim.provider.js';
import { UnconfiguredPlacesProvider } from './infrastructure/unconfigured-places.provider.js';
import { ActivityDiscoveryService } from './application/activity-discovery.service.js';
import { PointsOfInterestProvider } from './domain/points-of-interest.provider.js';
import { OverpassProvider } from './infrastructure/overpass.provider.js';
import { UnconfiguredPointsOfInterestProvider } from './infrastructure/unconfigured-points-of-interest.provider.js';
import { DestinationActivitiesController } from './presentation/destination-activities.controller.js';
import { PlacesController } from './presentation/places.controller.js';

@Module({
  imports: [
    AuthModule,
    CatalogAccessModule,
    ActivityCatalogModule,
    DestinationCatalogModule,
  ],
  controllers: [PlacesController, DestinationActivitiesController],
  providers: [
    PlacesService,
    ActivityDiscoveryService,
    {
      provide: PointsOfInterestProvider,
      useFactory: (): PointsOfInterestProvider =>
        env.PLACES_USER_AGENT
          ? new OverpassProvider({
              urls: env.OVERPASS_URL,
              userAgent: env.PLACES_USER_AGENT,
              timeoutMs: env.OVERPASS_TIMEOUT_MS,
            })
          : new UnconfiguredPointsOfInterestProvider(),
    },
    {
      provide: PlacesProvider,
      useFactory: (): PlacesProvider => {
        if (!env.PLACES_USER_AGENT) {
          new Logger('PlacesModule').warn(
            'PLACES_USER_AGENT is not set: the places endpoints will answer 503',
          );
          return new UnconfiguredPlacesProvider();
        }

        return new NominatimProvider({
          baseUrl: env.PLACES_BASE_URL,
          userAgent: env.PLACES_USER_AGENT,
          timeoutMs: env.PLACES_TIMEOUT_MS,
        });
      },
    },
  ],
})
export class PlacesModule {}
