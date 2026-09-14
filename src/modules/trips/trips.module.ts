import { Module } from '@nestjs/common';
import { TripsController } from './controller/trips.controller.js';
import { TripsService } from './service/trips.service.js';

@Module({
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
