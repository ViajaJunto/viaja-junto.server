import { HealthIndicatorService } from '@nestjs/terminus';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../shared/database/prisma.service.js';
import { DatabaseHealthIndicator } from './database.health-indicator.js';

const build = (query: ReturnType<typeof vi.fn>) =>
  new DatabaseHealthIndicator(
    { $queryRaw: query } as unknown as PrismaService,
    new HealthIndicatorService(),
  );

describe('DatabaseHealthIndicator', () => {
  it('is up when the database answers', async () => {
    const result = await build(
      vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    ).check('database');

    expect(result).toEqual({ database: { status: 'up' } });
  });

  it('is down when the database fails, without leaking why', async () => {
    const query = vi
      .fn()
      .mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:5432'));

    const result = await build(query).check('database');

    expect(result).toEqual({
      database: { status: 'down', message: 'The database did not answer' },
    });
    expect(JSON.stringify(result)).not.toContain('10.0.0.5');
  });
});
