import { Module } from '@nestjs/common';
import { TripActivitiesController } from './controller/trip-activities.controller.js';
import { TripActivitiesService } from './service/trip-activities.service.js';

@Module({
  controllers: [TripActivitiesController],
  providers: [TripActivitiesService],
  exports: [TripActivitiesService],
})
export class TripActivitiesModule {}
