import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { accessibleTrips } from '../../../shared/database/trip-scope.js';
import { TripDestination } from '../domain/trip-destination.entity.js';
import {
  CreateTripDestinationData,
  UpdateTripDestinationData,
  TripDestinationRepository,
} from '../domain/trip-destination.repository.js';

@Injectable()
export class TripDestinationPrismaRepository implements TripDestinationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    { skip, take }: PageRequest,
    userId: string,
  ): Promise<Page<TripDestination>> {
    // One transaction so the page and the total come from the same snapshot.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tripDestination.findMany({
        where: { trip: accessibleTrips(userId) },
        skip,
        take,
        orderBy: { order: { sort: 'asc', nulls: 'last' } },
      }),
      this.prisma.tripDestination.count({
        where: { trip: accessibleTrips(userId) },
      }),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<TripDestination | null> {
    return this.prisma.tripDestination.findUnique({ where: { id } });
  }

  create(data: CreateTripDestinationData): Promise<TripDestination> {
    return this.prisma.tripDestination.create({ data });
  }

  update(
    id: string,
    data: UpdateTripDestinationData,
  ): Promise<TripDestination> {
    return this.prisma.tripDestination.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.tripDestination.delete({ where: { id } });
  }
}
