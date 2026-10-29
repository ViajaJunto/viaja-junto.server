import { describe, expect, it, vi } from 'vitest';
import type { TripEvent } from '../../../shared/events/trip-events.js';
import type { NotificationsService } from '../application/notifications.service.js';
import { TripEventListener } from './trip-event.listener.js';

const event: TripEvent = {
  type: 'BUDGET_CHANGED',
  tripId: 't',
  actorId: 'ana',
};

describe('TripEventListener', () => {
  it('hands the event to the notifications service', async () => {
    const notifications = { notify: vi.fn().mockResolvedValue(undefined) };
    const listener = new TripEventListener(
      notifications as unknown as NotificationsService,
    );

    await listener.onTripChanged(event);

    expect(notifications.notify).toHaveBeenCalledWith(event);
  });

  it('swallows a failure: the change already happened and must not turn into an error', async () => {
    const notifications = {
      notify: vi.fn().mockRejectedValue(new Error('db down')),
    };
    const listener = new TripEventListener(
      notifications as unknown as NotificationsService,
    );

    await expect(listener.onTripChanged(event)).resolves.toBeUndefined();
  });
});
