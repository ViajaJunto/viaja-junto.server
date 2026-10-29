import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { accessibleTrips } from '../../../shared/database/trip-scope.js';
import { Trip, UserTrip } from '../domain/trip.entity.js';
import {
  CreateTripData,
  TripFilter,
  UpdateTripData,
  TripRepository,
} from '../domain/trip.repository.js';

@Injectable()
export class TripPrismaRepository implements TripRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    { skip, take }: PageRequest,
    userId: string,
    { status }: TripFilter,
  ): Promise<Page<UserTrip>> {
    const where: Prisma.TripWhereInput = {
      AND: [accessibleTrips(userId), status ? { status } : {}],
    };

    // One transaction so the page and the total come from the same snapshot.
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.trip.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          members: { where: { userId }, select: { permission: true } },
        },
      }),
      this.prisma.trip.count({ where }),
    ]);

    const items = rows.map(({ members, ...trip }): UserTrip => ({
      ...trip,
      role: trip.createdBy === userId ? 'OWNER' : members[0].permission,
    }));

    return { items, total };
  }

  findById(id: string): Promise<Trip | null> {
    return this.prisma.trip.findUnique({ where: { id } });
  }

  async hasExpenses(tripId: string): Promise<boolean> {
    return (await this.prisma.tripExpense.count({ where: { tripId } })) > 0;
  }

  findByInviteCode(inviteCode: string): Promise<Trip | null> {
    return this.prisma.trip.findUnique({ where: { inviteCode } });
  }

  create(data: CreateTripData): Promise<Trip> {
    return this.prisma.trip.create({ data });
  }

  update(id: string, data: UpdateTripData): Promise<Trip> {
    return this.prisma.trip.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.trip.delete({ where: { id } });
  }
}
