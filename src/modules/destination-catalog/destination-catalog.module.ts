import { Module } from '@nestjs/common';
import { DestinationCatalogService } from './application/destination-catalog.service.js';
import { DestinationCatalogRepository } from './domain/destination-catalog.repository.js';
import { DestinationCatalogPrismaRepository } from './infrastructure/destination-catalog.prisma.repository.js';
import { DestinationCatalogController } from './presentation/destination-catalog.controller.js';

@Module({
  controllers: [DestinationCatalogController],
  providers: [
    DestinationCatalogService,
    // Dependency inversion: the application depends on the domain contract,
    // and infrastructure supplies the concrete implementation.
    { provide: DestinationCatalogRepository, useClass: DestinationCatalogPrismaRepository },
  ],
  exports: [DestinationCatalogService],
})
export class DestinationCatalogModule {}
