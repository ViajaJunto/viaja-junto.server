import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../shared/domain/pagination.js';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import { Review } from '../domain/review.entity.js';
import {
  CreateReviewData,
  UpdateReviewData,
  ReviewRepository,
} from '../domain/review.repository.js';

@Injectable()
export class ReviewPrismaRepository implements ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll({ skip, take }: PageRequest): Promise<Page<Review>> {
    // One transaction so the page and the total come from the same snapshot.
    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count(),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<Review | null> {
    return this.prisma.review.findUnique({ where: { id } });
  }

  create(data: CreateReviewData): Promise<Review> {
    return this.prisma.review.create({ data });
  }

  update(id: string, data: UpdateReviewData): Promise<Review> {
    return this.prisma.review.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.review.delete({ where: { id } });
  }
}
