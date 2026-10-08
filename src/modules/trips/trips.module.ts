import { Module } from '@nestjs/common';
import { TripAccessModule } from '../trip-access/trip-access.module.js';
import { TripsService } from './application/trips.service.js';
import { TripRepository } from './domain/trip.repository.js';
import { TripPrismaRepository } from './infrastructure/trip.prisma.repository.js';
import { TripsController } from './presentation/trips.controller.js';

@Module({
  imports: [TripAccessModule],
  controllers: [TripsController],
  providers: [
    TripsService,
    // Dependency inversion: the application depends on the domain contract,
    // and infrastructure supplies the concrete implementation.
    { provide: TripRepository, useClass: TripPrismaRepository },
  ],
  exports: [TripsService],
})
export class TripsModule {}
