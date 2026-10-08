import type { Prisma } from '@prisma/client';

/** Trips a user can see: the ones they created plus the ones they joined. */
export function accessibleTrips(userId: string): Prisma.TripWhereInput {
  return {
    OR: [{ createdBy: userId }, { members: { some: { userId } } }],
  };
}
