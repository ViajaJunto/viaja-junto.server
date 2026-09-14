import { CreateTripMemberDto } from '../dto/create-trip-member.dto.js';
import { UpdateTripMemberDto } from '../dto/update-trip-member.dto.js';
import { TripMember } from '../model/trip-member.model.js';

export interface TripMemberRepository {
  findAll(): Promise<TripMember[]>;
  findById(id: string): Promise<TripMember | null>;
  create(data: CreateTripMemberDto): Promise<TripMember>;
  update(id: string, data: UpdateTripMemberDto): Promise<TripMember>;
  remove(id: string): Promise<void>;
}
