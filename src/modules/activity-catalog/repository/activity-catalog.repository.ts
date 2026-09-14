import { CreateActivityCatalogDto } from '../dto/create-activity-catalog.dto.js';
import { UpdateActivityCatalogDto } from '../dto/update-activity-catalog.dto.js';
import { ActivityCatalog } from '../model/activity-catalog.model.js';

export interface ActivityCatalogRepository {
  findAll(): Promise<ActivityCatalog[]>;
  findById(id: string): Promise<ActivityCatalog | null>;
  create(data: CreateActivityCatalogDto): Promise<ActivityCatalog>;
  update(id: string, data: UpdateActivityCatalogDto): Promise<ActivityCatalog>;
  remove(id: string): Promise<void>;
}
