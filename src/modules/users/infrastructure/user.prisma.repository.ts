import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import {
  lockActivities,
  syncActivityRatings,
} from '../../../shared/database/activity-rating.js';
import {
  lockDestinations,
  syncDestinationRatings,
} from '../../../shared/database/destination-rating.js';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { accessibleTrips } from '../../../shared/database/trip-scope.js';
import { User } from '../domain/user.entity.js';
import type { VisitedPlace } from '../domain/visited-countries.js';
import {
  CreateUserData,
  UpdateUserData,
  UserRepository,
  UserSession,
} from '../domain/user.repository.js';

@Injectable()
export class UserPrismaRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll({ skip, take }: PageRequest): Promise<Page<User>> {
    // One transaction so the page and the total come from the same snapshot.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.user.count(),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  findSession(id: string): Promise<UserSession | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: { tokensValidAfter: true },
    });
  }

  async revokeTokens(id: string, validAfter: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { tokensValidAfter: validAfter },
    });
  }

  async findVisitedPlaces(userId: string): Promise<VisitedPlace[]> {
    const destinations = await this.prisma.tripDestination.findMany({
      where: {
        trip: { AND: [accessibleTrips(userId), { status: 'COMPLETED' }] },
      },
      select: {
        tripId: true,
        destinationCatalog: { select: { country: true, countryCode: true } },
      },
    });

    return destinations.map(({ tripId, destinationCatalog }) => ({
      tripId,
      country: destinationCatalog.country,
      countryCode: destinationCatalog.countryCode,
    }));
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }

  update(id: string, data: UpdateUserData): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  /**
   * Deleting a user cascades to their reviews, so the ratings of the
   * activities and destinations they reviewed are refreshed in the same transaction.
   */
  async remove(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const reviewed = (
        await tx.review.findMany({
          where: { userId: id },
          select: { activityId: true },
        })
      ).map(({ activityId }) => activityId);

      const reviewedDestinations = (
        await tx.destinationReview.findMany({
          where: { userId: id },
          select: { destinationId: true },
        })
      ).map(({ destinationId }) => destinationId);

      await lockActivities(tx, reviewed);
      await lockDestinations(tx, reviewedDestinations);
      await tx.user.delete({ where: { id } });
      await syncActivityRatings(tx, reviewed);
      await syncDestinationRatings(tx, reviewedDestinations);
    });
  }
}
