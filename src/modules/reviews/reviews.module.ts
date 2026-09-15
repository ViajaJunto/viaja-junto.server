import { Module } from '@nestjs/common';
import { ReviewsService } from './application/reviews.service.js';
import { ReviewRepository } from './domain/review.repository.js';
import { ReviewPrismaRepository } from './infrastructure/review.prisma.repository.js';
import { ReviewsController } from './presentation/reviews.controller.js';

@Module({
  controllers: [ReviewsController],
  providers: [
    ReviewsService,
    // Inversao de dependencia: a aplicacao depende do contrato do dominio,
    // e a infraestrutura fornece a implementacao concreta.
    { provide: ReviewRepository, useClass: ReviewPrismaRepository },
  ],
  exports: [ReviewsService],
})
export class ReviewsModule {}
