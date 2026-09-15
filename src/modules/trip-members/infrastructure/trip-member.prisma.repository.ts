import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { TripMember } from '../domain/trip-member.entity.js';
import {
  CreateTripMemberData,
  UpdateTripMemberData,
  TripMemberRepository,
} from '../domain/trip-member.repository.js';

@Injectable()
export class TripMemberPrismaRepository implements TripMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<TripMember[]> {
    return this.prisma.tripMember.findMany();
  }

  findById(id: string): Promise<TripMember | null> {
    return this.prisma.tripMember.findUnique({ where: { id } });
  }

  create(data: CreateTripMemberData): Promise<TripMember> {
    return this.prisma.tripMember.create({ data });
  }

  update(id: string, data: UpdateTripMemberData): Promise<TripMember> {
    return this.prisma.tripMember.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.tripMember.delete({ where: { id } });
  }
}
