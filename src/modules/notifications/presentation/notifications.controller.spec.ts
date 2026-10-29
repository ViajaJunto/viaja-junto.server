import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationsService } from '../application/notifications.service.js';
import { NotificationsController } from './notifications.controller.js';

const id = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ana@example.com',
};

describe('NotificationsController', () => {
  let service: Record<
    'findAll' | 'unreadCount' | 'markRead' | 'markAllRead',
    ReturnType<typeof vi.fn>
  >;
  let controller: NotificationsController;

  beforeEach(() => {
    service = {
      findAll: vi.fn(),
      unreadCount: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn(),
    };
    controller = new NotificationsController(
      service as unknown as NotificationsService,
    );
  });

  it('forwards the query and the caller on list', () => {
    controller.findAll({ page: 2 }, user);

    expect(service.findAll).toHaveBeenCalledWith({ page: 2 }, user);
  });

  it('asks for the unread count of the caller', () => {
    controller.unreadCount(user);

    expect(service.unreadCount).toHaveBeenCalledWith(user);
  });

  it('marks one notification as read for the caller', () => {
    controller.markRead(id, user);

    expect(service.markRead).toHaveBeenCalledWith(id, user);
  });

  it('marks everything as read for the caller', () => {
    controller.markAllRead(user);

    expect(service.markAllRead).toHaveBeenCalledWith(user);
  });
});
