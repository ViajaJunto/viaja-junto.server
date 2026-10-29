// Who is told about a trip change, and what they are told. Pure.
import type { TripEvent } from '../../../shared/events/trip-events.js';
import type { NotificationPayload } from './notification.entity.js';

/**
 * Everyone on the trip plus whoever the event adds (a member who was just
 * removed), each once, **never the person who did it**.
 */
export function recipientsFor(
  event: TripEvent,
  tripPeople: string[],
): string[] {
  return [...new Set([...tripPeople, ...(event.alsoNotify ?? [])])].filter(
    (userId) => userId !== event.actorId,
  );
}

/** The stored payload: the event's own details plus the names to show. */
export function payloadFor(
  event: TripEvent,
  context: { tripName: string | null; actorName: string | null },
): NotificationPayload {
  return {
    tripName: context.tripName,
    actorName: context.actorName,
    ...(event.subjectId ? { subjectId: event.subjectId } : {}),
    ...event.details,
  };
}
