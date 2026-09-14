import { Injectable } from '@nestjs/common';
import { CreateTripActivityDto } from '../dto/create-trip-activity.dto.js';
import { UpdateTripActivityDto } from '../dto/update-trip-activity.dto.js';

@Injectable()
export class TripActivitiesService {
  findAll() { return []; }
  findOne(id: string) { return { id, message: 'Trip activity mock response' }; }
  create(data: CreateTripActivityDto) { return { id: 'mock-trip-activity-id', ...data }; }
  update(id: string, data: UpdateTripActivityDto) { return { id, ...data }; }
  remove(id: string) { return { id, message: 'Trip activity removed mock response' }; }
}
