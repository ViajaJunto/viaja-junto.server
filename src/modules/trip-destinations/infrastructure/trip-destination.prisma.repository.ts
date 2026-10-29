import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { accessibleTrips } from '../../../shared/database/trip-scope.js';
import type { TripRange } from '../domain/destination-dates.js';
import { TripDestination } from '../domain/trip-destination.entity.js';
import {
  CreateTripDestinationData,
  UpdateTripDestinationData,
  TripDestinationFilter,
  TripDestinationRepository,
} from '../domain/trip-destination.repository.js';

@Injectable()
export class TripDestinationPrismaRepository implements TripDestinationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    { skip, take }: PageRequest,
    userId: string,
    filter: TripDestinationFilter,
  ): Promise<Page<TripDestination>> {
    const where: Prisma.TripDestinationWhereInput = {
      trip: accessibleTrips(userId),
      tripId: filter.tripId,
    };

    // One transaction so the page and the total come from the same snapshot.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tripDestination.findMany({
        where,
        skip,
        take,
        orderBy: { order: { sort: 'asc', nulls: 'last' } },
      }),
      this.prisma.tripDestination.count({
        where,
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

  findTripDates(tripId: string): Promise<TripRange | null> {
    return this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { startDate: true, endDate: true },
    });
  }

  findByTrip(tripId: string): Promise<TripDestination[]> {
    return this.prisma.tripDestination.findMany({
      where: { tripId },
      orderBy: [{ order: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
    });
  }

  async reorder(
    tripId: string,
    orderedIds: string[],
  ): Promise<TripDestination[]> {
    await this.prisma.$transaction(
      orderedIds.map((id, position) =>
        this.prisma.tripDestination.update({
          where: { id, tripId },
          data: { order: position },
        }),
      ),
    );

    return this.findByTrip(tripId);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.tripDestination.delete({ where: { id } });
  }
}
