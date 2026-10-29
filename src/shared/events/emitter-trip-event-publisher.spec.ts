import type { EventEmitter2 } from '@nestjs/event-emitter';
import { describe, expect, it, vi } from 'vitest';
import {
  EmitterTripEventPublisher,
  TRIP_CHANGED,
} from './emitter-trip-event-publisher.js';
import type { TripEvent } from './trip-events.js';

const event: TripEvent = { type: 'MEMBER_JOINED', tripId: 't', actorId: 'ana' };

describe('EmitterTripEventPublisher', () => {
  it('emits the event under the name listeners subscribe to', () => {
    const emitter = { emit: vi.fn() };

    new EmitterTripEventPublisher(emitter as unknown as EventEmitter2).publish(
      event,
    );

    expect(emitter.emit).toHaveBeenCalledWith(TRIP_CHANGED, event);
  });

  it('never lets a failing listener break the change that announced it', () => {
    const emitter = {
      emit: vi.fn(() => {
        throw new Error('listener blew up');
      }),
    };

    expect(() =>
      new EmitterTripEventPublisher(
        emitter as unknown as EventEmitter2,
      ).publish(event),
    ).not.toThrow();
  });
});
