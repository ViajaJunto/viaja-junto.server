import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { accessibleTrips } from '../../../shared/database/trip-scope.js';
import { TripMember } from '../domain/trip-member.entity.js';
import {
  CreateTripMemberData,
  UpdateTripMemberData,
  TripMemberRepository,
} from '../domain/trip-member.repository.js';

@Injectable()
export class TripMemberPrismaRepository implements TripMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    { skip, take }: PageRequest,
    userId: string,
  ): Promise<Page<TripMember>> {
    // One transaction so the page and the total come from the same snapshot.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tripMember.findMany({
        where: { trip: accessibleTrips(userId) },
        skip,
        take,
        orderBy: { joinedAt: 'desc' },
      }),
      this.prisma.tripMember.count({
        where: { trip: accessibleTrips(userId) },
      }),
    ]);

    return { items, total };
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
