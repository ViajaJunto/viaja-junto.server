import { Module } from '@nestjs/common';
import { TripActivitiesService } from './application/trip-activities.service.js';
import { TripActivityRepository } from './domain/trip-activity.repository.js';
import { TripActivityPrismaRepository } from './infrastructure/trip-activity.prisma.repository.js';
import { TripActivitiesController } from './presentation/trip-activities.controller.js';

@Module({
  controllers: [TripActivitiesController],
  providers: [
    TripActivitiesService,
    // Inversao de dependencia: a aplicacao depende do contrato do dominio,
    // e a infraestrutura fornece a implementacao concreta.
    { provide: TripActivityRepository, useClass: TripActivityPrismaRepository },
  ],
  exports: [TripActivitiesService],
})
export class TripActivitiesModule {}
