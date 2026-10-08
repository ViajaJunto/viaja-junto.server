import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  ApiAuthenticated,
  ApiForbidden,
} from '../../../shared/http/decorators/api-auth-responses.decorator.js';
import {
  ApiIdParam,
  ApiNotFound,
} from '../../../shared/http/decorators/api-resource-responses.decorator.js';
import { ApiPaginatedResponse } from '../../../shared/http/decorators/api-paginated-response.decorator.js';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../../shared/http/dto/error-response.dto.js';
import { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard.js';
import { CreateReviewDto } from '../application/dto/create-review.dto.js';
import { UpdateReviewDto } from '../application/dto/update-review.dto.js';
import { ReviewResponseDto } from '../application/dto/review-response.dto.js';
import { ReviewsService } from '../application/reviews.service.js';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @ApiOperation({
    summary: 'Browse reviews',
    description:
      'Returns a paginated list of community reviews, newest first. Public — visitors can read reviews without an account.',
  })
  @ApiPaginatedResponse(ReviewResponseDto, 'Page of review records.')
  @ApiUnprocessableEntityResponse({
    description: 'Invalid pagination parameters.',
    type: ValidationErrorResponseDto,
  })
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  @ApiOperation({
    summary: 'Get a review by id',
    description: 'Returns a single review with its rating and comment. Public.',
  })
  @ApiIdParam('Review identifier.')
  @ApiOkResponse({
    description: 'The requested review.',
    type: ReviewResponseDto,
  })
  @ApiNotFound('No review exists with this id.')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({
    summary: 'Write a review',
    description:
      'Rates an activity from 1 to 5 with an optional comment. Requires authentication; a user can review the same activity only once.',
  })
  @ApiBody({ type: CreateReviewDto })
  @ApiCreatedResponse({
    description: 'The created review.',
    type: ReviewResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'This user has already reviewed this activity.',
    type: ErrorResponseDto,
  })
  @ApiAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateReviewDto,
    @CurrentUser() author: AuthenticatedUser,
  ) {
    return this.service.create(dto, author);
  }

  @ApiOperation({
    summary: 'Update a review',
    description:
      'Edits the rating or the comment. Only the author can do this.',
  })
  @ApiIdParam('Review identifier.')
  @ApiBody({ type: UpdateReviewDto })
  @ApiOkResponse({
    description: 'The updated review.',
    type: ReviewResponseDto,
  })
  @ApiNotFound('No review exists with this id.')
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @ApiForbidden('Only the review author can do this.')
  @ApiAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() author: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, author);
  }

  @ApiOperation({
    summary: 'Delete a review',
    description:
      'Removes the review and recalculates the activity average rating.',
  })
  @ApiIdParam('Review identifier.')
  @ApiNoContentResponse({ description: 'Deleted. No content returned.' })
  @ApiNotFound('No review exists with this id.')
  @ApiForbidden('Only the review author can do this.')
  @ApiAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() author: AuthenticatedUser,
  ) {
    return this.service.remove(id, author);
  }
}
