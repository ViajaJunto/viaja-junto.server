import { Review } from './review.entity.js';

export type CreateReviewData = Omit<Review, 'id' | 'createdAt'>;
export type UpdateReviewData = Partial<CreateReviewData>;

/**
 * Contrato de persistencia do agregado Review.
 *
 * Classe abstrata em vez de interface: o container de injecao de
 * dependencia do Nest precisa de um token que exista em runtime,
 * e interfaces do TypeScript desaparecem na compilacao.
 */
export abstract class ReviewRepository {
  abstract findAll(): Promise<Review[]>;
  abstract findById(id: string): Promise<Review | null>;
  abstract create(data: CreateReviewData): Promise<Review>;
  abstract update(id: string, data: UpdateReviewData): Promise<Review>;
  abstract remove(id: string): Promise<void>;
}
