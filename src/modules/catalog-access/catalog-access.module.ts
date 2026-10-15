import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { CatalogAccessService } from './application/catalog-access.service.js';

@Module({
  imports: [UsersModule],
  providers: [CatalogAccessService],
  exports: [CatalogAccessService],
})
export class CatalogAccessModule {}
