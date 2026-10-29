import { Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiAuthenticated } from '../../../shared/http/decorators/api-auth-responses.decorator.js';
import { ApiPaginatedResponse } from '../../../shared/http/decorators/api-paginated-response.decorator.js';
import {
  ApiIdParam,
  ApiNotFound,
} from '../../../shared/http/decorators/api-resource-responses.decorator.js';
import { IdParam } from '../../../shared/http/decorators/id-param.decorator.js';
import { ValidationErrorResponseDto } from '../../../shared/http/dto/error-response.dto.js';
import { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard.js';
import {
  MarkedReadResponseDto,
  NotificationResponseDto,
  UnreadCountResponseDto,
} from '../application/dto/notification-response.dto.js';
import { NotificationsService } from '../application/notifications.service.js';

/** In-app notifications about the trips the caller belongs to (FR21). */
@ApiTags('Notifications')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @ApiOperation({
    summary: 'List my notifications',
    description:
      'The caller’s notifications, unread first and newest first within each group. Created when a member joins, leaves or changes permission, when destinations, activities or the budget change, and when the trip status changes — always for everyone on the trip except who did it.',
  })
  @ApiPaginatedResponse(NotificationResponseDto, 'Page of notifications.')
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
    summary: 'Count unread notifications',
    description:
      'For the badge on the bell: how many of the caller’s notifications are unread.',
  })
  @ApiOkResponse({ type: UnreadCountResponseDto })
  @ApiAuthenticated()
  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.service.unreadCount(user);
  }

  @ApiOperation({
    summary: 'Mark every notification as read',
    description: 'Marks all of the caller’s unread notifications as read.',
  })
  @ApiOkResponse({ type: MarkedReadResponseDto })
  @ApiAuthenticated()
  @Patch('read-all')
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.service.markAllRead(user);
  }

  @ApiOperation({
    summary: 'Mark a notification as read',
    description:
      'Idempotent: reading one that is already read changes nothing. A notification belonging to someone else answers 404.',
  })
  @ApiIdParam('Notification identifier.')
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiNotFound('No notification of the caller has this id.')
  @ApiAuthenticated()
  @Patch(':id/read')
  markRead(@IdParam() id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.markRead(id, user);
  }
}
