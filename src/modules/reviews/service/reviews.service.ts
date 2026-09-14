import { Injectable } from '@nestjs/common';
import { CreateReviewDto } from '../dto/create-review.dto.js';
import { UpdateReviewDto } from '../dto/update-review.dto.js';

@Injectable()
export class ReviewsService {
  findAll() {
    return [];
  }

  findOne(id: string) {
    return { id, message: 'Review mock response' };
  }

  create(createReviewDto: CreateReviewDto) {
    return {
      id: 'mock-review-id',
      ...createReviewDto,
      message: 'Review created mock response',
    };
  }

  update(id: string, updateReviewDto: UpdateReviewDto) {
    return {
      id,
      ...updateReviewDto,
      message: 'Review updated mock response',
    };
  }

  remove(id: string) {
    return {
      id,
      message: 'Review removed mock response',
    };
  }
}
