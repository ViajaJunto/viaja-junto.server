import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import type { Notification } from './notification.entity.js';

export type NewNotification = Omit<Notification, 'id' | 'readAt' | 'createdAt'>;

/**
 * Persistence contract for notifications.
 *
 * Declared as an abstract class so Nest can use it as a DI token.
 */
export abstract class NotificationRepository {
  abstract createMany(notifications: NewNotification[]): Promise<void>;
  /** The user's notifications: unread first, then newest first. */
  abstract findAll(
    page: PageRequest,
    userId: string,
  ): Promise<Page<Notification>>;
  abstract countUnread(userId: string): Promise<number>;
  /** Marks one of the user's notifications as read; null when it is not theirs or does not exist. */
  abstract markRead(id: string, userId: string): Promise<Notification | null>;
  /** Marks every unread notification of the user as read and returns how many there were. */
  abstract markAllRead(userId: string): Promise<number>;
  /** The creator and the members of the trip; empty when the trip does not exist. */
  abstract findTripPeople(tripId: string): Promise<string[]>;
  /** The names a notification needs to say what happened. */
  abstract findNames(
    tripId: string,
    actorId: string,
  ): Promise<{ tripName: string | null; actorName: string | null }>;
}
