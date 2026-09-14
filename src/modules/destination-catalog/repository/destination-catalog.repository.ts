import { CreateDestinationCatalogDto } from '../dto/create-destination-catalog.dto.js';
import { UpdateDestinationCatalogDto } from '../dto/update-destination-catalog.dto.js';
import { DestinationCatalog } from '../model/destination-catalog.model.js';

export interface DestinationCatalogRepository {
  findAll(): Promise<DestinationCatalog[]>;
  findById(id: string): Promise<DestinationCatalog | null>;
  create(data: CreateDestinationCatalogDto): Promise<DestinationCatalog>;
  update(id: string, data: UpdateDestinationCatalogDto): Promise<DestinationCatalog>;
  remove(id: string): Promise<void>;
}
