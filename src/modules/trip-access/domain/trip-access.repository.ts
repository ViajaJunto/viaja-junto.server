/** How a user relates to a trip. */
export type TripRole = 'CREATOR' | 'EDITOR' | 'VIEWER';

/**
 * Read-only lookups the trip-access policy is built on.
 *
 * Declared as an abstract class so Nest can use it as a DI token.
 */
export abstract class TripAccessRepository {
  /** The user's role on the trip; null when the trip is missing or unrelated to the user. */
  abstract findRole(tripId: string, userId: string): Promise<TripRole | null>;
  abstract findTripIdByDestination(
    tripDestinationId: string,
  ): Promise<string | null>;
  abstract findTripIdByActivity(tripActivityId: string): Promise<string | null>;
}
