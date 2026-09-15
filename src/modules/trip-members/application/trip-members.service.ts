import { Injectable, NotFoundException } from '@nestjs/common';
import { TripMember } from '../domain/trip-member.entity.js';
import { TripMemberRepository } from '../domain/trip-member.repository.js';
import { CreateTripMemberDto } from './dto/create-trip-member.dto.js';
import { UpdateTripMemberDto } from './dto/update-trip-member.dto.js';

@Injectable()
export class TripMembersService {
  constructor(private readonly repository: TripMemberRepository) {}

  findAll(): Promise<TripMember[]> {
    return this.repository.findAll();
  }

  async findOne(id: string): Promise<TripMember> {
    const found = await this.repository.findById(id);
    if (!found) {
      throw new NotFoundException(`TripMember with id "${id}" not found`);
    }
    return found;
  }

  create(dto: CreateTripMemberDto): Promise<TripMember> {
    return this.repository.create({ ...dto });
  }

  async update(id: string, dto: UpdateTripMemberDto): Promise<TripMember> {
    await this.findOne(id);
    return this.repository.update(id, { ...dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.remove(id);
  }
}
