import { Module } from '@nestjs/common';
import { TripAccessService } from './application/trip-access.service.js';
import { TripAccessRepository } from './domain/trip-access.repository.js';
import { TripAccessPrismaRepository } from './infrastructure/trip-access.prisma.repository.js';

@Module({
  providers: [
    TripAccessService,
    { provide: TripAccessRepository, useClass: TripAccessPrismaRepository },
  ],
  exports: [TripAccessService],
})
export class TripAccessModule {}
