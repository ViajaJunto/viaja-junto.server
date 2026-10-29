import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TripDestinationsService } from '../application/trip-destinations.service.js';
import { TripItineraryController } from './trip-itinerary.controller.js';

describe('TripItineraryController', () => {
  const tripId = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'ana@example.com',
  };

  let service: { reorder: ReturnType<typeof vi.fn> };
  let controller: TripItineraryController;

  beforeEach(() => {
    service = { reorder: vi.fn() };
    controller = new TripItineraryController(
      service as unknown as TripDestinationsService,
    );
  });

  it('hands the trip, the new order and the caller to the service', () => {
    const dto = { destinationIds: ['a', 'b'] };
    const reordered = [{ id: 'b' }, { id: 'a' }];
    service.reorder.mockReturnValue(reordered);

    const result = controller.reorder(tripId, dto, user);

    expect(service.reorder).toHaveBeenCalledWith(tripId, dto, user);
    expect(result).toBe(reordered);
  });
});
