import { Injectable } from '@nestjs/common';
import { CreateActivityCatalogDto } from '../dto/create-activity-catalog.dto.js';
import { UpdateActivityCatalogDto } from '../dto/update-activity-catalog.dto.js';

@Injectable()
export class ActivityCatalogService {
  findAll() { return []; }
  findOne(id: string) { return { id, message: 'Activity catalog mock response' }; }
  create(data: CreateActivityCatalogDto) { return { id: 'mock-activity-catalog-id', ...data }; }
  update(id: string, data: UpdateActivityCatalogDto) { return { id, ...data }; }
  remove(id: string) { return { id, message: 'Activity catalog removed mock response' }; }
}
