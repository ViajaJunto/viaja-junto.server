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
import { CreateTripMemberDto } from '../application/dto/create-trip-member.dto.js';
import { UpdateTripMemberDto } from '../application/dto/update-trip-member.dto.js';
import { TripMemberResponseDto } from '../application/dto/trip-member-response.dto.js';
import { TripMembersService } from '../application/trip-members.service.js';

@ApiTags('Trip Members')
@UseGuards(JwtAuthGuard)
@Controller('trip-members')
export class TripMembersController {
  constructor(private readonly service: TripMembersService) {}

  @ApiOperation({
    summary: 'List trip members',
    description:
      'Returns a paginated list of trip memberships. Requires authentication.',
  })
  @ApiPaginatedResponse(TripMemberResponseDto, 'Page of trip member records.')
  @ApiUnprocessableEntityResponse({
    description: 'Invalid pagination parameters.',
    type: ValidationErrorResponseDto,
  })
  @ApiAuthenticated()
  @Get()
  findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findAll(query, user);
  }

  @ApiOperation({
    summary: 'Get a membership by id',
    description: 'Returns a single membership record.',
  })
  @ApiIdParam('TripMember identifier.')
  @ApiOkResponse({
    description: 'The requested trip member.',
    type: TripMemberResponseDto,
  })
  @ApiNotFound('No trip member exists with this id.')
  @ApiAuthenticated()
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user);
  }

  @ApiOperation({
    summary: 'Invite a member',
    description:
      'Adds a user to a trip with the given permission level. Only the trip creator can invite. A user can only be added once per trip.',
  })
  @ApiBody({ type: CreateTripMemberDto })
  @ApiCreatedResponse({
    description: 'The created trip member.',
    type: TripMemberResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @ApiConflictResponse({
    description:
      'This user is already a member of the trip, or is the trip creator.',
    type: ErrorResponseDto,
  })
  @ApiForbidden('Only the trip creator can manage members.')
  @ApiAuthenticated()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateTripMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }

  @ApiOperation({
    summary: 'Change a member permission',
    description:
      'Promotes a member to EDITOR or demotes them to VIEWER. Only the trip creator can do this.',
  })
  @ApiIdParam('TripMember identifier.')
  @ApiBody({ type: UpdateTripMemberDto })
  @ApiOkResponse({
    description: 'The updated trip member.',
    type: TripMemberResponseDto,
  })
  @ApiNotFound('No trip member exists with this id.')
  @ApiUnprocessableEntityResponse({
    description: 'The payload failed validation.',
    type: ValidationErrorResponseDto,
  })
  @ApiForbidden('Only the trip creator can manage members.')
  @ApiAuthenticated()
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @ApiOperation({
    summary: 'Remove a member',
    description:
      'Revokes a user access to the trip. The trip itself is not affected.',
  })
  @ApiIdParam('TripMember identifier.')
  @ApiNoContentResponse({ description: 'Deleted. No content returned.' })
  @ApiNotFound('No trip member exists with this id.')
  @ApiForbidden('Only the trip creator can manage members.')
  @ApiAuthenticated()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove(id, user);
  }
}
