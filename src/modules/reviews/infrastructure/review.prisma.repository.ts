import { Injectable } from '@nestjs/common';
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

  findAll(): Promise<Review[]> {
    return this.prisma.review.findMany();
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
