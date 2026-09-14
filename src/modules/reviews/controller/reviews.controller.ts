import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateReviewDto } from '../dto/create-review.dto.js';
import { UpdateReviewDto } from '../dto/update-review.dto.js';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  @ApiOperation({ summary: 'List all reviews' })
  @Get()
  findAll() {
    return {
      success: true,
      message: 'Mock list of reviews',
      data: [
        {
          id: 'review-1',
          userId: 'user-1',
          activityId: 'activity-1',
          rating: 5,
        },
      ],
    };
  }

  @ApiOperation({ summary: 'Get a review by id' })
  @ApiParam({ name: 'id', description: 'Review identifier' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return {
      success: true,
      message: 'Mock review details',
      data: {
        id,
        userId: 'user-1',
        activityId: 'activity-1',
        rating: 5,
      },
    };
  }

  @ApiOperation({ summary: 'Create a review' })
  @ApiBody({ type: CreateReviewDto })
  @Post()
  create(@Body() createReviewDto: CreateReviewDto) {
    return {
      success: true,
      message: 'Mock review created',
      data: {
        id: 'mock-review-id',
        ...createReviewDto,
      },
    };
  }

  @ApiOperation({ summary: 'Update a review' })
  @ApiParam({ name: 'id', description: 'Review identifier' })
  @ApiBody({ type: UpdateReviewDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto) {
    return {
      success: true,
      message: 'Mock review updated',
      data: {
        id,
        ...updateReviewDto,
      },
    };
  }

  @ApiOperation({ summary: 'Delete a review' })
  @ApiParam({ name: 'id', description: 'Review identifier' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return {
      success: true,
      message: 'Mock review removed',
      data: { id },
    };
  }
}
