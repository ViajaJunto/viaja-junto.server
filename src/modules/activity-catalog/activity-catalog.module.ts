import { Module } from '@nestjs/common';
import { ActivityCatalogController } from './controller/activity-catalog.controller.js';
import { ActivityCatalogService } from './service/activity-catalog.service.js';

@Module({
  controllers: [ActivityCatalogController],
  providers: [ActivityCatalogService],
  exports: [ActivityCatalogService],
})
export class ActivityCatalogModule {}
