// Domain entity — no framework and no ORM dependency.
import type {
  TripEventDetails,
  TripEventType,
} from '../../../shared/events/trip-events.js';

/** What a notification tells: names and ids the client needs to say what happened. */
export interface NotificationPayload extends TripEventDetails {
  tripName: string | null;
  /** Null if the person who did it no longer has an account. */
  actorName: string | null;
}

export interface Notification {
  id: string;
  /** Who it is for. */
  userId: string;
  tripId: string;
  /** Who did it; null if they deleted their account. */
  actorId: string | null;
  type: TripEventType;
  payload: NotificationPayload;
  readAt: Date | null;
  createdAt: Date;
}
