import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { accessibleTrips } from '../../../shared/database/trip-scope.js';
import { TripActivity } from '../domain/trip-activity.entity.js';
import {
  CreateTripActivityData,
  UpdateTripActivityData,
  TripActivityRepository,
} from '../domain/trip-activity.repository.js';

@Injectable()
export class TripActivityPrismaRepository implements TripActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    { skip, take }: PageRequest,
    userId: string,
  ): Promise<Page<TripActivity>> {
    // One transaction so the page and the total come from the same snapshot.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tripActivity.findMany({
        where: { tripDestination: { trip: accessibleTrips(userId) } },
        skip,
        take,
        orderBy: { dateTime: { sort: 'asc', nulls: 'last' } },
      }),
      this.prisma.tripActivity.count({
        where: { tripDestination: { trip: accessibleTrips(userId) } },
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

  async remove(id: string): Promise<void> {
    await this.prisma.tripActivity.delete({ where: { id } });
  }
}
