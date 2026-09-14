import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ActivitiesModule } from './modules/activities/activities.module.js';
import { ActivityCatalogModule } from './modules/activity-catalog/activity-catalog.module.js';
import { BudgetModule } from './modules/budget/budget.module.js';
import { DestinationCatalogModule } from './modules/destination-catalog/destination-catalog.module.js';
import { DestinationsModule } from './modules/destinations/destinations.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { TripActivitiesModule } from './modules/trip-activities/trip-activities.module.js';
import { TripDestinationsModule } from './modules/trip-destinations/trip-destinations.module.js';
import { TripMembersModule } from './modules/trip-members/trip-members.module.js';
import { TripsModule } from './modules/trips/trips.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    UsersModule,
    TripsModule,
    TripMembersModule,
    DestinationCatalogModule,
    TripDestinationsModule,
    DestinationsModule,
    ActivityCatalogModule,
    TripActivitiesModule,
    ActivitiesModule,
    BudgetModule,
    ReviewsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
