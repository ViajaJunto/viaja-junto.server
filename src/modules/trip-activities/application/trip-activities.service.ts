import { Injectable, NotFoundException } from '@nestjs/common';
import { TripActivity } from '../domain/trip-activity.entity.js';
import { TripActivityRepository } from '../domain/trip-activity.repository.js';
import { CreateTripActivityDto } from './dto/create-trip-activity.dto.js';
import { UpdateTripActivityDto } from './dto/update-trip-activity.dto.js';

@Injectable()
export class TripActivitiesService {
  constructor(private readonly repository: TripActivityRepository) {}

  findAll(): Promise<TripActivity[]> {
    return this.repository.findAll();
  }

  async findOne(id: string): Promise<TripActivity> {
    const found = await this.repository.findById(id);
    if (!found) {
      throw new NotFoundException(`TripActivity with id "${id}" not found`);
    }
    return found;
  }

  create(dto: CreateTripActivityDto): Promise<TripActivity> {
    return this.repository.create({ ...dto, status: dto.status ?? 'PENDING' });
  }

  async update(id: string, dto: UpdateTripActivityDto): Promise<TripActivity> {
    await this.findOne(id);
    return this.repository.update(id, { ...dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.remove(id);
  }
}
