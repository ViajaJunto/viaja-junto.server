import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TripsService } from '../application/trips.service.js';
import { TripInviteController } from './trip-invite.controller.js';

describe('TripInviteController', () => {
  const id = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'ana@example.com',
  };

  let service: Record<
    'join' | 'getInviteCode' | 'regenerateInviteCode',
    ReturnType<typeof vi.fn>
  >;
  let controller: TripInviteController;

  beforeEach(() => {
    service = {
      join: vi.fn(),
      getInviteCode: vi.fn(),
      regenerateInviteCode: vi.fn(),
    };
    controller = new TripInviteController(service as unknown as TripsService);
  });

  it('forwards the code and the caller on join', () => {
    controller.join({ code: 'K7M2QX9P' }, user);

    expect(service.join).toHaveBeenCalledWith({ code: 'K7M2QX9P' }, user);
  });

  it('forwards the trip and the caller to read the code', () => {
    controller.getInviteCode(id, user);

    expect(service.getInviteCode).toHaveBeenCalledWith(id, user);
  });

  it('forwards the trip and the caller to regenerate the code', () => {
    controller.regenerateInviteCode(id, user);

    expect(service.regenerateInviteCode).toHaveBeenCalledWith(id, user);
  });
});
