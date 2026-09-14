import { Injectable } from '@nestjs/common';
import { CreateTripDto } from '../dto/create-trip.dto.js';
import { UpdateTripDto } from '../dto/update-trip.dto.js';

@Injectable()
export class TripsService {
  findAll() {
    return [];
  }

  findOne(id: string) {
    return { id, message: 'Trip mock response' };
  }

  create(createTripDto: CreateTripDto) {
    return {
      id: 'mock-trip-id',
      ...createTripDto,
      message: 'Trip created mock response',
    };
  }

  update(id: string, updateTripDto: UpdateTripDto) {
    return {
      id,
      ...updateTripDto,
      message: 'Trip updated mock response',
    };
  }

  remove(id: string) {
    return {
      id,
      message: 'Trip removed mock response',
    };
  }
}
