import { CreateTripDestinationDto } from '../dto/create-trip-destination.dto.js';
import { UpdateTripDestinationDto } from '../dto/update-trip-destination.dto.js';
import { TripDestination } from '../model/trip-destination.model.js';

export interface TripDestinationRepository {
  findAll(): Promise<TripDestination[]>;
  findById(id: string): Promise<TripDestination | null>;
  create(data: CreateTripDestinationDto): Promise<TripDestination>;
  update(id: string, data: UpdateTripDestinationDto): Promise<TripDestination>;
  remove(id: string): Promise<void>;
}
