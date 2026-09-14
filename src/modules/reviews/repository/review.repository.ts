import { CreateReviewDto } from '../dto/create-review.dto.js';
import { UpdateReviewDto } from '../dto/update-review.dto.js';
import { Review } from '../model/review.model.js';

export interface ReviewRepository {
  findAll(): Promise<Review[]>;
  findById(id: string): Promise<Review | null>;
  create(data: CreateReviewDto): Promise<Review>;
  update(id: string, data: UpdateReviewDto): Promise<Review>;
  remove(id: string): Promise<void>;
}
