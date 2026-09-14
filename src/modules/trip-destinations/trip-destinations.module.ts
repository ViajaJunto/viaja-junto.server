import { Module } from '@nestjs/common';
import { TripDestinationsController } from './controller/trip-destinations.controller.js';
import { TripDestinationsService } from './service/trip-destinations.service.js';

@Module({
  controllers: [TripDestinationsController],
  providers: [TripDestinationsService],
  exports: [TripDestinationsService],
})
export class TripDestinationsModule {}
