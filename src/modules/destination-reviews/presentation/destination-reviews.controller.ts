import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { StrictRateLimit } from '../../../shared/http/throttling.js';
import { IdParam } from '../../../shared/http/decorators/id-param.decorator.js';
import { ApiPaginatedResponse } from '../../../shared/http/decorators/api-paginated-response.decorator.js';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../../shared/http/dto/error-response.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard.js';
import { ListDestinationReviewsQueryDto } from '../application/dto/list-destination-reviews-query.dto.js';
import { CreateDestinationReviewDto } from '../application/dto/create-destination-review.dto.js';
import { UpdateDestinationReviewDto } from '../application/dto/update-destination-review.dto.js';
import { DestinationReviewResponseDto } from '../application/dto/destination-review-response.dto.js';
import { DestinationReviewsService } from '../application/destination-reviews.service.js';

@ApiTags('Destination Reviews')
@Controller('destination-reviews')
export class DestinationReviewsController {
  constructor(private readonly service: DestinationReviewsService) {}

  @ApiOperation({
    summary: 'Browse destination reviews',
    description:
      'Returns a paginated list of destination reviews, newest first. Narrow it with `destinationId`. Public — visitors can read reviews without an account.',
  })
  @ApiPaginatedResponse(
    DestinationReviewResponseDto,
    'Page of destination review records.',
  )
  @ApiUnprocessableEntityResponse({
    description: 'Invalid pagination parameters.',
    type: ValidationErrorResponseDto,
  })
  @Get()
  findAll(@Query() query: ListDestinationReviewsQueryDto) {
    return this.service.findAll(query);
  }

  @ApiOperation({
    summary: 'Get a destination review by id',
    description: 'Returns a single review with its rating and comment. Public.',
  })
  @ApiIdParam('Destination review identifier.')
  @ApiOkResponse({
    description: 'The requested review.',
    type: DestinationReviewResponseDto,
  })
  @ApiNotFound('No destination review exists with this id.')
  @Get(':id')
  findOne(@IdParam() id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({
    summary: 'Review a destination',
    description:
      'Rates a destination from 1 to 5 with an optional comment. Only travellers who created or joined a COMPLETED trip with that destination can do it, and only once per destination.',
  })
  @ApiBody({ type: CreateDestinationReviewDto })
  @ApiCreatedResponse({
    description: 'The created review.',
    type: DestinationReviewResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'This user has already reviewed this destination.',
    type: ErrorResponseDto,
  })
  @ApiForbidden('The caller has not completed a trip to this destination.')
  @ApiNotFound('The reviewed catalog destination does not exist.')
  @ApiAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Post()
  @StrictRateLimit()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateDestinationReviewDto,
    @CurrentUser() author: AuthenticatedUser,
  ) {
    return this.service.create(dto, author);
  }

  @ApiOperation({
    summary: 'Update a destination review',
    description:
      'Edits the rating or the comment. Only the author can do this.',
  })
  @ApiIdParam('Destination review identifier.')
  @ApiBody({ type: UpdateDestinationReviewDto })
  @ApiOkResponse({
    description: 'The updated review.',
    type: DestinationReviewResponseDto,
  })
  @ApiNotFound('No destination review exists with this id.')
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @ApiForbidden('Only the review author can do this.')
  @ApiAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @IdParam() id: string,
    @Body() dto: UpdateDestinationReviewDto,
    @CurrentUser() author: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, author);
  }

  @ApiOperation({
    summary: 'Delete a destination review',
    description:
      'Removes the review and recalculates the destination rating. Only the author can do this.',
  })
  @ApiIdParam('Destination review identifier.')
  @ApiNoContentResponse({ description: 'Deleted. No content returned.' })
  @ApiNotFound('No destination review exists with this id.')
  @ApiForbidden('Only the review author can do this.')
  @ApiAuthenticated()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@IdParam() id: string, @CurrentUser() author: AuthenticatedUser) {
    return this.service.remove(id, author);
  }
}
