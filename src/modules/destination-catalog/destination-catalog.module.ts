import { Module } from '@nestjs/common';
import { DestinationCatalogService } from './application/destination-catalog.service.js';
import { DestinationCatalogRepository } from './domain/destination-catalog.repository.js';
import { DestinationCatalogPrismaRepository } from './infrastructure/destination-catalog.prisma.repository.js';
import { DestinationCatalogController } from './presentation/destination-catalog.controller.js';

@Module({
  controllers: [DestinationCatalogController],
  providers: [
    DestinationCatalogService,
    // Inversao de dependencia: a aplicacao depende do contrato do dominio,
    // e a infraestrutura fornece a implementacao concreta.
    { provide: DestinationCatalogRepository, useClass: DestinationCatalogPrismaRepository },
  ],
  exports: [DestinationCatalogService],
})
export class DestinationCatalogModule {}
