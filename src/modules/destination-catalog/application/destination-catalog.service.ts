import { Injectable, NotFoundException } from '@nestjs/common';
import { DestinationCatalog } from '../domain/destination-catalog.entity.js';
import { DestinationCatalogRepository } from '../domain/destination-catalog.repository.js';
import { CreateDestinationCatalogDto } from './dto/create-destination-catalog.dto.js';
import { UpdateDestinationCatalogDto } from './dto/update-destination-catalog.dto.js';

@Injectable()
export class DestinationCatalogService {
  constructor(private readonly repository: DestinationCatalogRepository) {}

  findAll(): Promise<DestinationCatalog[]> {
    return this.repository.findAll();
  }

  async findOne(id: string): Promise<DestinationCatalog> {
    const found = await this.repository.findById(id);
    if (!found) {
      throw new NotFoundException(`DestinationCatalog with id "${id}" not found`);
    }
    return found;
  }

  create(dto: CreateDestinationCatalogDto): Promise<DestinationCatalog> {
    return this.repository.create({ ...dto });
  }

  async update(id: string, dto: UpdateDestinationCatalogDto): Promise<DestinationCatalog> {
    await this.findOne(id);
    return this.repository.update(id, { ...dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.remove(id);
  }
}
