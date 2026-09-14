import { Module } from '@nestjs/common';
import { ReviewsController } from './controller/reviews.controller.js';
import { ReviewsService } from './service/reviews.service.js';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
