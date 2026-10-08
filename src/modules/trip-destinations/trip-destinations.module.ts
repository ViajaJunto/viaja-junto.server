import { TripAccessModule } from '../trip-access/trip-access.module.js';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TripDestinationsService } from './application/trip-destinations.service.js';
import { TripDestinationRepository } from './domain/trip-destination.repository.js';
import { TripDestinationPrismaRepository } from './infrastructure/trip-destination.prisma.repository.js';
import { TripDestinationsController } from './presentation/trip-destinations.controller.js';

@Module({
  imports: [AuthModule, TripAccessModule],
  controllers: [TripDestinationsController],
  providers: [
    TripDestinationsService,
    // Dependency inversion: the application depends on the domain contract,
    // and infrastructure supplies the concrete implementation.
    {
      provide: TripDestinationRepository,
      useClass: TripDestinationPrismaRepository,
    },
  ],
  exports: [TripDestinationsService],
})
export class TripDestinationsModule {}
