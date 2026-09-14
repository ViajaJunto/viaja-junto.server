import { Module } from '@nestjs/common';
import { DestinationCatalogController } from './controller/destination-catalog.controller.js';
import { DestinationCatalogService } from './service/destination-catalog.service.js';

@Module({
  controllers: [DestinationCatalogController],
  providers: [DestinationCatalogService],
  exports: [DestinationCatalogService],
})
export class DestinationCatalogModule {}
