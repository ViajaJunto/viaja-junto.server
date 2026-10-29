import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { accessibleTrips } from '../../../shared/database/trip-scope.js';
import type { DestinationStay } from '../domain/activity-schedule.js';
import { TripActivity } from '../domain/trip-activity.entity.js';
import {
  CreateTripActivityData,
  UpdateTripActivityData,
  TripActivityFilter,
  TripActivityRepository,
} from '../domain/trip-activity.repository.js';

@Injectable()
export class TripActivityPrismaRepository implements TripActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    { skip, take }: PageRequest,
    userId: string,
    filter: TripActivityFilter,
  ): Promise<Page<TripActivity>> {
    const where: Prisma.TripActivityWhereInput = {
      tripDestination: { trip: accessibleTrips(userId) },
      tripDestinationId: filter.tripDestinationId,
    };

    // One transaction so the page and the total come from the same snapshot.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tripActivity.findMany({
        where,
        skip,
        take,
        orderBy: [{ dateTime: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
      }),
      this.prisma.tripActivity.count({
        where,
      }),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<TripActivity | null> {
    return this.prisma.tripActivity.findUnique({ where: { id } });
  }

  create(data: CreateTripActivityData): Promise<TripActivity> {
    return this.prisma.tripActivity.create({ data });
  }

  update(id: string, data: UpdateTripActivityData): Promise<TripActivity> {
    return this.prisma.tripActivity.update({ where: { id }, data });
  }

  findDestinationStay(
    tripDestinationId: string,
  ): Promise<DestinationStay | null> {
    return this.prisma.tripDestination.findUnique({
      where: { id: tripDestinationId },
      select: { arrival: true, departure: true },
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.tripActivity.delete({ where: { id } });
  }
}
