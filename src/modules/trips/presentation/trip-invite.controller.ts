import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../../shared/http/dto/error-response.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard.js';
import { InviteCodeResponseDto } from '../application/dto/invite-code-response.dto.js';
import { JoinTripDto } from '../application/dto/join-trip.dto.js';
import { TripResponseDto } from '../application/dto/trip-response.dto.js';
import { TripsService } from '../application/trips.service.js';

/** Inviting collaborators to a trip with a shareable code (FR18). */
@ApiTags('Trips')
@UseGuards(JwtAuthGuard)
@Controller('trips')
export class TripInviteController {
  constructor(private readonly service: TripsService) {}

  @ApiOperation({
    summary: 'Join a trip with an invite code',
    description:
      'Adds the caller to the trip behind the code as a VIEWER and returns the trip. The creator can later raise the permission through the trip members.',
  })
  @ApiBody({ type: JoinTripDto })
  @ApiCreatedResponse({
    description: 'The trip the caller just joined.',
    type: TripResponseDto,
  })
  @ApiNotFound('No trip has this invite code.')
  @ApiConflictResponse({
    description: 'The caller is already a member of the trip, or created it.',
    type: ErrorResponseDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'The code is malformed.',
    type: ValidationErrorResponseDto,
  })
  @ApiAuthenticated()
  @Post('join')
  @StrictRateLimit()
  join(@Body() dto: JoinTripDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.join(dto, user);
  }

  @ApiOperation({
    summary: 'Get the invite code of a trip',
    description: 'Only the trip creator can read the code.',
  })
  @ApiIdParam('Trip identifier.')
  @ApiOkResponse({ type: InviteCodeResponseDto })
  @ApiNotFound(
    'No trip exists with this id, or the caller has no access to it.',
  )
  @ApiForbidden('Only the trip creator can read the invite code.')
  @ApiAuthenticated()
  @Get(':id/invite-code')
  getInviteCode(@IdParam() id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getInviteCode(id, user);
  }

  @ApiOperation({
    summary: 'Regenerate the invite code of a trip',
    description:
      'Replaces the code, so the previous one stops working. Members who already joined keep their access. Only the trip creator can do this.',
  })
  @ApiIdParam('Trip identifier.')
  @ApiOkResponse({ type: InviteCodeResponseDto })
  @ApiNotFound(
    'No trip exists with this id, or the caller has no access to it.',
  )
  @ApiForbidden('Only the trip creator can regenerate the invite code.')
  @ApiAuthenticated()
  @Post(':id/invite-code/regenerate')
  @HttpCode(HttpStatus.OK)
  regenerateInviteCode(
    @IdParam() id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.regenerateInviteCode(id, user);
  }
}
