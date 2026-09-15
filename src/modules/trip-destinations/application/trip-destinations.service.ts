import { Injectable, NotFoundException } from '@nestjs/common';
import { TripDestination } from '../domain/trip-destination.entity.js';
import { TripDestinationRepository } from '../domain/trip-destination.repository.js';
import { CreateTripDestinationDto } from './dto/create-trip-destination.dto.js';
import { UpdateTripDestinationDto } from './dto/update-trip-destination.dto.js';

@Injectable()
export class TripDestinationsService {
  constructor(private readonly repository: TripDestinationRepository) {}

  findAll(): Promise<TripDestination[]> {
    return this.repository.findAll();
  }

  async findOne(id: string): Promise<TripDestination> {
    const found = await this.repository.findById(id);
    if (!found) {
      throw new NotFoundException(`TripDestination with id "${id}" not found`);
    }
    return found;
  }

  create(dto: CreateTripDestinationDto): Promise<TripDestination> {
    return this.repository.create({ ...dto });
  }

  async update(id: string, dto: UpdateTripDestinationDto): Promise<TripDestination> {
    await this.findOne(id);
    return this.repository.update(id, { ...dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.remove(id);
  }
}
