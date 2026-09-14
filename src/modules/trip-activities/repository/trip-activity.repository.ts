import { CreateTripActivityDto } from '../dto/create-trip-activity.dto.js';
import { UpdateTripActivityDto } from '../dto/update-trip-activity.dto.js';
import { TripActivity } from '../model/trip-activity.model.js';

export interface TripActivityRepository {
  findAll(): Promise<TripActivity[]>;
  findById(id: string): Promise<TripActivity | null>;
  create(data: CreateTripActivityDto): Promise<TripActivity>;
  update(id: string, data: UpdateTripActivityDto): Promise<TripActivity>;
  remove(id: string): Promise<void>;
}
