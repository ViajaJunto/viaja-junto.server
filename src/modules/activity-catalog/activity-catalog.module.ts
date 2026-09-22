import { Module } from '@nestjs/common';
import { ActivityCatalogService } from './application/activity-catalog.service.js';
import { ActivityCatalogRepository } from './domain/activity-catalog.repository.js';
import { ActivityCatalogPrismaRepository } from './infrastructure/activity-catalog.prisma.repository.js';
import { ActivityCatalogController } from './presentation/activity-catalog.controller.js';

@Module({
  controllers: [ActivityCatalogController],
  providers: [
    ActivityCatalogService,
    // Dependency inversion: the application depends on the domain contract,
    // and infrastructure supplies the concrete implementation.
    { provide: ActivityCatalogRepository, useClass: ActivityCatalogPrismaRepository },
  ],
  exports: [ActivityCatalogService],
})
export class ActivityCatalogModule {}
