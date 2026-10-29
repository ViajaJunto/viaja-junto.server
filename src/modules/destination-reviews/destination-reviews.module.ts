import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DestinationReviewsService } from './application/destination-reviews.service.js';
import { DestinationReviewRepository } from './domain/destination-review.repository.js';
import { DestinationReviewPrismaRepository } from './infrastructure/destination-review.prisma.repository.js';
import { DestinationReviewsController } from './presentation/destination-reviews.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [DestinationReviewsController],
  providers: [
    DestinationReviewsService,
    // Dependency inversion: the application depends on the domain contract,
    // and infrastructure supplies the concrete implementation.
    {
      provide: DestinationReviewRepository,
      useClass: DestinationReviewPrismaRepository,
    },
  ],
})
export class DestinationReviewsModule {}
