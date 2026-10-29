import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { PrismaService } from '../../../shared/database/prisma.service.js';

/** Reports whether the database answers a trivial query. */
@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly indicators: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.indicators.check(key);

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return indicator.up();
    } catch {
      // The reason (a connection string, a host name) stays in the logs, not
      // in a response anyone can read.
      return indicator.down({ message: 'The database did not answer' });
    }
  }
}
