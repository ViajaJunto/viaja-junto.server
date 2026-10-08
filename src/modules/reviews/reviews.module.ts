import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ReviewsService } from './application/reviews.service.js';
import { ReviewRepository } from './domain/review.repository.js';
import { ReviewPrismaRepository } from './infrastructure/review.prisma.repository.js';
import { ReviewsController } from './presentation/reviews.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [ReviewsController],
  providers: [
    ReviewsService,
    // Dependency inversion: the application depends on the domain contract,
    // and infrastructure supplies the concrete implementation.
    { provide: ReviewRepository, useClass: ReviewPrismaRepository },
  ],
  exports: [ReviewsService],
})
export class ReviewsModule {}
