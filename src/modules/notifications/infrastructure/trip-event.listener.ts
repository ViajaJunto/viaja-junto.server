import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TRIP_CHANGED } from '../../../shared/events/emitter-trip-event-publisher.js';
import type { TripEvent } from '../../../shared/events/trip-events.js';
import { NotificationsService } from '../application/notifications.service.js';

/** Turns the trip changes the services announce into notifications. */
@Injectable()
export class TripEventListener {
  private readonly logger = new Logger(TripEventListener.name);

  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(TRIP_CHANGED, { async: true })
  async onTripChanged(event: TripEvent): Promise<void> {
    try {
      await this.notifications.notify(event);
    } catch (error) {
      // The change already happened; a missed notification must not surface as an error.
      this.logger.error(
        `Could not notify about ${event.type} on trip ${event.tripId}: ${(error as Error).message}`,
      );
    }
  }
}
