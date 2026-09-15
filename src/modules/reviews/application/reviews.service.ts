import { Injectable, NotFoundException } from '@nestjs/common';
import { Review } from '../domain/review.entity.js';
import { ReviewRepository } from '../domain/review.repository.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';

@Injectable()
export class ReviewsService {
  constructor(private readonly repository: ReviewRepository) {}

  findAll(): Promise<Review[]> {
    return this.repository.findAll();
  }

  async findOne(id: string): Promise<Review> {
    const found = await this.repository.findById(id);
    if (!found) {
      throw new NotFoundException(`Review with id "${id}" not found`);
    }
    return found;
  }

  create(dto: CreateReviewDto): Promise<Review> {
    return this.repository.create({ ...dto });
  }

  async update(id: string, dto: UpdateReviewDto): Promise<Review> {
    await this.findOne(id);
    return this.repository.update(id, { ...dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repository.remove(id);
  }
}
