import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

/**
 * Prisma client exposed as a Nest provider.
 *
 * As of Prisma 7 the client no longer reads the URL from the schema: the
 * connection arrives through a driver adapter (PrismaPg, backed by `pg`).
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // The environment was already validated by Zod at boot
    // (src/shared/config/env.ts), so DATABASE_URL exists and is well formed.
    super({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
