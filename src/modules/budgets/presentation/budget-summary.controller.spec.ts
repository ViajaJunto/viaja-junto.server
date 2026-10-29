import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BudgetsService } from '../application/budgets.service.js';
import { BudgetSummaryController } from './budget-summary.controller.js';

describe('BudgetSummaryController', () => {
  const id = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'ana@example.com',
  };

  let service: { summarize: ReturnType<typeof vi.fn> };
  let controller: BudgetSummaryController;

  beforeEach(() => {
    service = { summarize: vi.fn() };
    controller = new BudgetSummaryController(
      service as unknown as BudgetsService,
    );
  });

  it('asks the service for the summary of the trip, on behalf of the caller', () => {
    const summary = { planned: 10 };
    service.summarize.mockReturnValue(summary);

    const result = controller.summary(id, user);

    expect(service.summarize).toHaveBeenCalledWith(id, user);
    expect(result).toBe(summary);
  });
});
