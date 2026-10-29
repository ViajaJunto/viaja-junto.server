import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TripEvent, TripEventPublisher } from './trip-events.js';

/** The name listeners subscribe to with `@OnEvent`. */
export const TRIP_CHANGED = 'trip.changed';

@Injectable()
export class EmitterTripEventPublisher implements TripEventPublisher {
  private readonly logger = new Logger(EmitterTripEventPublisher.name);

  constructor(private readonly emitter: EventEmitter2) {}

  publish(event: TripEvent): void {
    try {
      this.emitter.emit(TRIP_CHANGED, event);
    } catch (error) {
      // Notifying is a side effect of the change, never a reason to undo it.
      this.logger.error(
        `Could not publish ${event.type}: ${(error as Error).message}`,
      );
    }
  }
}
