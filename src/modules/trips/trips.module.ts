import { Module } from '@nestjs/common';
import { TripsService } from './application/trips.service.js';
import { TripRepository } from './domain/trip.repository.js';
import { TripPrismaRepository } from './infrastructure/trip.prisma.repository.js';
import { TripsController } from './presentation/trips.controller.js';

@Module({
  controllers: [TripsController],
  providers: [
    TripsService,
    // Inversao de dependencia: a aplicacao depende do contrato do dominio,
    // e a infraestrutura fornece a implementacao concreta.
    { provide: TripRepository, useClass: TripPrismaRepository },
  ],
  exports: [TripsService],
})
export class TripsModule {}
