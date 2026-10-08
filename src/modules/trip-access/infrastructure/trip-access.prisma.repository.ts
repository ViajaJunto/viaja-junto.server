import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import {
  TripAccessRepository,
  type TripRole,
} from '../domain/trip-access.repository.js';

@Injectable()
export class TripAccessPrismaRepository implements TripAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRole(tripId: string, userId: string): Promise<TripRole | null> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        createdBy: true,
        members: { where: { userId }, select: { permission: true } },
      },
    });

    if (!trip) {
      return null;
    }
    if (trip.createdBy === userId) {
      return 'CREATOR';
    }

    return trip.members[0]?.permission ?? null;
  }

  async findTripIdByDestination(id: string): Promise<string | null> {
    const found = await this.prisma.tripDestination.findUnique({
      where: { id },
      select: { tripId: true },
    });

    return found?.tripId ?? null;
  }

  async findTripIdByActivity(id: string): Promise<string | null> {
    const found = await this.prisma.tripActivity.findUnique({
      where: { id },
      select: { tripDestination: { select: { tripId: true } } },
    });

    return found?.tripDestination.tripId ?? null;
  }
}
