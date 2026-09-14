import { Injectable } from '@nestjs/common';
import { CreateTripDestinationDto } from '../dto/create-trip-destination.dto.js';
import { UpdateTripDestinationDto } from '../dto/update-trip-destination.dto.js';

@Injectable()
export class TripDestinationsService {
  findAll() { return []; }
  findOne(id: string) { return { id, message: 'Trip destination mock response' }; }
  create(data: CreateTripDestinationDto) { return { id: 'mock-trip-destination-id', ...data }; }
  update(id: string, data: UpdateTripDestinationDto) { return { id, ...data }; }
  remove(id: string) { return { id, message: 'Trip destination removed mock response' }; }
}
