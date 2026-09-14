import { CreateTripDto } from '../dto/create-trip.dto.js';
import { UpdateTripDto } from '../dto/update-trip.dto.js';
import { Trip } from '../model/trip.model.js';

export interface TripRepository {
  findAll(): Promise<Trip[]>;
  findById(id: string): Promise<Trip | null>;
  create(data: CreateTripDto): Promise<Trip>;
  update(id: string, data: UpdateTripDto): Promise<Trip>;
  remove(id: string): Promise<void>;
}
