import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './shared/database/prisma.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { TripsModule } from './modules/trips/trips.module.js';
import { TripMembersModule } from './modules/trip-members/trip-members.module.js';
import { DestinationCatalogModule } from './modules/destination-catalog/destination-catalog.module.js';
import { TripDestinationsModule } from './modules/trip-destinations/trip-destinations.module.js';
import { ActivityCatalogModule } from './modules/activity-catalog/activity-catalog.module.js';
import { TripActivitiesModule } from './modules/trip-activities/trip-activities.module.js';
import { BudgetsModule } from './modules/budgets/budgets.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    TripsModule,
    TripMembersModule,
    DestinationCatalogModule,
    TripDestinationsModule,
    ActivityCatalogModule,
    TripActivitiesModule,
    BudgetsModule,
    ReviewsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
