// What happened to a trip, as the rest of the application announces it.
// No framework and no ORM dependency.

export const TRIP_EVENT_TYPES = [
  'MEMBER_JOINED',
  'MEMBER_REMOVED',
  'MEMBER_PERMISSION_CHANGED',
  'DESTINATION_ADDED',
  'DESTINATION_UPDATED',
  'DESTINATION_REMOVED',
  'ACTIVITY_ADDED',
  'ACTIVITY_UPDATED',
  'ACTIVITY_REMOVED',
  'BUDGET_CHANGED',
  'TRIP_STATUS_CHANGED',
] as const;

export type TripEventType = (typeof TRIP_EVENT_TYPES)[number];

/** Small, flat and stable: it is stored as the notification payload. */
export type TripEventDetails = Record<string, string | number | boolean | null>;

export interface TripEvent {
  type: TripEventType;
  tripId: string;
  /** Who did it. They are never notified about their own action. */
  actorId: string;
  /** The thing that changed (a destination, an activity, a member's user id...). */
  subjectId?: string;
  details?: TripEventDetails;
  /**
   * People to tell even though they are not (or no longer) on the trip, such
   * as a member who has just been removed.
   */
  alsoNotify?: string[];
}

/**
 * How services announce a change. A port, so they stay unaware of who listens
 * (or whether anyone does); declared as an abstract class so Nest can use it
 * as a DI token.
 */
export abstract class TripEventPublisher {
  /** Fire and forget: a failure to notify must never fail the change itself. */
  abstract publish(event: TripEvent): void;
}
