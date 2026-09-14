import { Injectable } from '@nestjs/common';
import { CreateTripMemberDto } from '../dto/create-trip-member.dto.js';
import { UpdateTripMemberDto } from '../dto/update-trip-member.dto.js';

@Injectable()
export class TripMembersService {
  findAll() {
    return [];
  }

  findOne(id: string) {
    return { id, message: 'Trip member mock response' };
  }

  create(createTripMemberDto: CreateTripMemberDto) {
    return {
      id: 'mock-trip-member-id',
      ...createTripMemberDto,
      message: 'Trip member created mock response',
    };
  }

  update(id: string, updateTripMemberDto: UpdateTripMemberDto) {
    return {
      id,
      ...updateTripMemberDto,
      message: 'Trip member updated mock response',
    };
  }

  remove(id: string) {
    return {
      id,
      message: 'Trip member removed mock response',
    };
  }
}
