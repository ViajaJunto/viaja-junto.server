import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateReviewDto } from '../application/dto/create-review.dto.js';
import { UpdateReviewDto } from '../application/dto/update-review.dto.js';
import { ReviewsService } from '../application/reviews.service.js';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @ApiOperation({ summary: 'List all reviews' })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: 'Get one reviews entry by id' })
  @ApiParam({ name: 'id', description: 'Review identifier' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new reviews entry' })
  @ApiBody({ type: CreateReviewDto })
  @Post()
  create(@Body() dto: CreateReviewDto) {
    return this.service.create(dto);
  }

  @ApiOperation({ summary: 'Update a reviews entry' })
  @ApiParam({ name: 'id', description: 'Review identifier' })
  @ApiBody({ type: UpdateReviewDto })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateReviewDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a reviews entry' })
  @ApiParam({ name: 'id', description: 'Review identifier' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
