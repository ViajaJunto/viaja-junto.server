import type { HealthCheckService } from '@nestjs/terminus';
import { describe, expect, it, vi } from 'vitest';
import type { DatabaseHealthIndicator } from '../infrastructure/database.health-indicator.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('asks terminus to run the database check', async () => {
    const result = { status: 'ok' };
    const health = {
      check: vi.fn(async (checks: (() => Promise<unknown>)[]) => {
        await Promise.all(checks.map((check) => check()));
        return result;
      }),
    };
    const database = {
      check: vi.fn().mockResolvedValue({ database: { status: 'up' } }),
    };
    const controller = new HealthController(
      health as unknown as HealthCheckService,
      database as unknown as DatabaseHealthIndicator,
    );

    await expect(controller.check()).resolves.toBe(result);
    expect(database.check).toHaveBeenCalledWith('database');
  });
});
