import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { User } from '../domain/user.entity.js';
import {
  CreateUserData,
  UpdateUserData,
  UserRepository,
  UserSession,
} from '../domain/user.repository.js';

@Injectable()
export class UserPrismaRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll({ skip, take }: PageRequest): Promise<Page<User>> {
    // One transaction so the page and the total come from the same snapshot.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  findSession(id: string): Promise<UserSession | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: { tokensValidAfter: true },
    });
  }

  async revokeTokens(id: string, validAfter: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { tokensValidAfter: validAfter },
    });
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }

  update(id: string, data: UpdateUserData): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
