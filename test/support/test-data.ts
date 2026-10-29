import { randomUUID } from 'node:crypto';
import type { PrismaService } from './../../src/shared/database/prisma.service.js';
import { inviteCode } from './../helpers.js';

export interface Account {
  id: string;
  email: string;
  name: string;
}

type Permission = 'EDITOR' | 'VIEWER';

/**
 * Builds the rows a suite needs and removes them when it ends.
 *
 * Suites share one database and run in parallel, so they cannot truncate it
 * between runs. Instead every row is created through here, stamped with a
 * per-suite tag, and `dispose()` deletes exactly those (children go with their
 * trip, review and member rows with their user or activity).
 */
export class TestData {
  /** Short and unique to this suite: makes names and emails collision-free. */
  readonly tag = randomUUID().replace(/-/g, '').slice(0, 8);

  private readonly users: string[] = [];
  private readonly destinations: string[] = [];
  private readonly activities: string[] = [];
  private counter = 0;

  constructor(private readonly prisma: PrismaService) {}

  private next(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${this.tag}-${this.counter}`;
  }

  async user(role: 'USER' | 'ADMIN' = 'USER'): Promise<Account> {
    const name = this.next('user');
    const user = await this.prisma.user.create({
      data: { name, email: `${name}@example.com`, role },
    });
    this.users.push(user.id);

    return { id: user.id, email: user.email, name: user.name };
  }

  /** A trip created straight in the database, owned by `owner`. */
  trip(
    owner: Account,
    overrides: {
      name?: string;
      status?: 'PLANNING' | 'CONFIRMED' | 'COMPLETED';
      createdAt?: Date;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ) {
    return this.prisma.trip.create({
      data: {
        name: this.next('trip'),
        inviteCode: inviteCode(),
        createdBy: owner.id,
        ...overrides,
      },
    });
  }

  member(tripId: string, user: Account, permission: Permission) {
    return this.prisma.tripMember.create({
      data: { tripId, userId: user.id, permission },
    });
  }

  async destination(
    overrides: { name?: string; country?: string; countryCode?: string } = {},
  ) {
    const row = await this.prisma.destinationCatalog.create({
      data: { name: this.next('destination'), ...overrides },
    });
    this.destinations.push(row.id);

    return row;
  }

  async activity(
    overrides: {
      name?: string;
      type?: 'TOUR' | 'FOOD' | 'LODGING' | 'TRANSPORT' | 'OTHER';
      city?: string;
    } = {},
  ) {
    const row = await this.prisma.activityCatalog.create({
      data: { name: this.next('activity'), ...overrides },
    });
    this.activities.push(row.id);

    return row;
  }

  /** Deletes everything this suite created. Safe to call twice. */
  async dispose(): Promise<void> {
    await this.prisma.trip.deleteMany({
      where: { createdBy: { in: this.users } },
    });
    await this.prisma.activityCatalog.deleteMany({
      where: { id: { in: this.activities } },
    });
    await this.prisma.destinationCatalog.deleteMany({
      where: { id: { in: this.destinations } },
    });
    await this.prisma.user.deleteMany({ where: { id: { in: this.users } } });
    this.users.length = 0;
    this.destinations.length = 0;
    this.activities.length = 0;
  }
}
