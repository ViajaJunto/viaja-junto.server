import { Injectable, NotFoundException } from '@nestjs/common';
import { Trip } from '../domain/trip.entity.js';
import { TripRepository } from '../domain/trip.repository.js';
import { CreateTripDto } from './dto/create-trip.dto.js';
import { UpdateTripDto } from './dto/update-trip.dto.js';

@Injectable()
export class TripsService {
  constructor(private readonly repository: TripRepository) {}

  findAll(): Promise<Trip[]> {
    return this.repository.findAll();
  }

  async findOne(id: string): Promise<Trip> {
    const found = await this.repository.findById(id);
    if (!found) {
      throw new NotFoundException(`Trip with id "${id}" not found`);
    }
    return found;
  }

  create(dto: CreateTripDto): Promise<Trip> {
    return this.repository.create({ ...dto, status: dto.status ?? 'PLANNING' });
  }

  async update(id: string, dto: UpdateTripDto): Promise<Trip> {
    await this.findOne(id);
    return this.repository.update(id, { ...dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.remove(id);
  }
}
