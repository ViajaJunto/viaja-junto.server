import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {
  buildThrottlerOptions,
  rateLimitsFromEnv,
} from './shared/http/throttling.js';
import { HealthModule } from './modules/health/health.module.js';
import { PrismaExceptionFilter } from './shared/http/prisma-exception.filter.js';
import { PrismaModule } from './shared/database/prisma.module.js';
import { StorageModule } from './shared/storage/storage.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { TripsModule } from './modules/trips/trips.module.js';
import { TripMembersModule } from './modules/trip-members/trip-members.module.js';
import { DestinationCatalogModule } from './modules/destination-catalog/destination-catalog.module.js';
import { TripDestinationsModule } from './modules/trip-destinations/trip-destinations.module.js';
import { ActivityCatalogModule } from './modules/activity-catalog/activity-catalog.module.js';
import { TripActivitiesModule } from './modules/trip-activities/trip-activities.module.js';
import { BudgetsModule } from './modules/budgets/budgets.module.js';
import { PlacesModule } from './modules/places/places.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { TripExpensesModule } from './modules/trip-expenses/trip-expenses.module.js';

@Module({
  imports: [
    ThrottlerModule.forRoot(buildThrottlerOptions(rateLimitsFromEnv())),
    PrismaModule,
    HealthModule,
    StorageModule,
    AuthModule,
    UsersModule,
    TripsModule,
    TripMembersModule,
    DestinationCatalogModule,
    TripDestinationsModule,
    ActivityCatalogModule,
    TripActivitiesModule,
    BudgetsModule,
    ReviewsModule,
    TripExpensesModule,
    PlacesModule,
  ],
  providers: [
    // Runs before the route guards, so a flood of unauthenticated requests
    // is counted (and stopped) before JWT validation.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Registered here rather than in main.ts so the e2e suite exercises it too.
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
