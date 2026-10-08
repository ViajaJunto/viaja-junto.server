import { TripAccessModule } from '../trip-access/trip-access.module.js';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TripActivitiesService } from './application/trip-activities.service.js';
import { TripActivityRepository } from './domain/trip-activity.repository.js';
import { TripActivityPrismaRepository } from './infrastructure/trip-activity.prisma.repository.js';
import { TripActivitiesController } from './presentation/trip-activities.controller.js';

@Module({
  imports: [AuthModule, TripAccessModule],
  controllers: [TripActivitiesController],
  providers: [
    TripActivitiesService,
    // Dependency inversion: the application depends on the domain contract,
    // and infrastructure supplies the concrete implementation.
    { provide: TripActivityRepository, useClass: TripActivityPrismaRepository },
  ],
  exports: [TripActivitiesService],
})
export class TripActivitiesModule {}
