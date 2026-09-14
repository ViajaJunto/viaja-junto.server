import { Injectable } from '@nestjs/common';
import { CreateDestinationCatalogDto } from '../dto/create-destination-catalog.dto.js';
import { UpdateDestinationCatalogDto } from '../dto/update-destination-catalog.dto.js';

@Injectable()
export class DestinationCatalogService {
  findAll() { return []; }
  findOne(id: string) { return { id, message: 'Destination catalog mock response' }; }
  create(data: CreateDestinationCatalogDto) { return { id: 'mock-destination-catalog-id', ...data }; }
  update(id: string, data: UpdateDestinationCatalogDto) { return { id, ...data }; }
  remove(id: string) { return { id, message: 'Destination catalog removed mock response' }; }
}
