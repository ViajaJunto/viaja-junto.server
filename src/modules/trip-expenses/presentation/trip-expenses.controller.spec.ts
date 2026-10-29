import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TripExpensesService } from '../application/trip-expenses.service.js';
import {
  TripExpenseSummaryController,
  TripExpensesController,
} from './trip-expenses.controller.js';

const id = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ana@example.com',
};

describe('TripExpensesController', () => {
  let service: Record<
    'findAll' | 'findOne' | 'create' | 'update' | 'remove' | 'summarize',
    ReturnType<typeof vi.fn>
  >;
  let controller: TripExpensesController;

  beforeEach(() => {
    service = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      summarize: vi.fn(),
    };
    controller = new TripExpensesController(
      service as unknown as TripExpensesService,
    );
  });

  it('forwards the query and the caller on list', () => {
    controller.findAll({ page: 2 }, user);

    expect(service.findAll).toHaveBeenCalledWith({ page: 2 }, user);
  });

  it('forwards the id and the caller on read', () => {
    controller.findOne(id, user);

    expect(service.findOne).toHaveBeenCalledWith(id, user);
  });

  it('forwards the body on create', () => {
    const dto = { tripId: id } as never;

    controller.create(dto, user);

    expect(service.create).toHaveBeenCalledWith(dto, user);
  });

  it('forwards id and body on update', () => {
    controller.update(id, { amount: 5 }, user);

    expect(service.update).toHaveBeenCalledWith(id, { amount: 5 }, user);
  });

  it('forwards the id on delete', () => {
    controller.remove(id, user);

    expect(service.remove).toHaveBeenCalledWith(id, user);
  });

  it('serves the summary of a trip through the trip route', () => {
    const summary = { total: 1 };
    service.summarize.mockReturnValue(summary);
    const summaryController = new TripExpenseSummaryController(
      service as unknown as TripExpensesService,
    );

    expect(summaryController.summary(id, user)).toBe(summary);
    expect(service.summarize).toHaveBeenCalledWith(id, user);
  });
});
