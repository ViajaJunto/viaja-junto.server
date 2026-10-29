import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import { TripEventPublisher } from '../../../shared/events/trip-events.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { TripAccessService } from '../../trip-access/application/trip-access.service.js';
import { TripMemberRepository } from '../domain/trip-member.repository.js';
import { ListTripMembersQueryDto } from './dto/list-trip-members-query.dto.js';
import { CreateTripMemberDto } from './dto/create-trip-member.dto.js';
import { UpdateTripMemberDto } from './dto/update-trip-member.dto.js';
import { TripMemberResponseDto } from './dto/trip-member-response.dto.js';

@Injectable()
export class TripMembersService {
  constructor(
    private readonly repository: TripMemberRepository,
    private readonly access: TripAccessService,
    private readonly events: TripEventPublisher,
  ) {}

  async findAll(
    query: ListTripMembersQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<TripMemberResponseDto>> {
    if (query.tripId) {
      await this.access.assertCanRead(query.tripId, user.id);
    }
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll(
      { skip, take },
      user.id,
      { tripId: query.tripId },
    );

    return {
      data: items.map((item) => TripMemberResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<TripMemberResponseDto> {
    const member = await this.getOrFail(id);
    await this.access.assertCanRead(member.tripId, user.id);

    return TripMemberResponseDto.from(member);
  }

  async create(
    dto: CreateTripMemberDto,
    user: AuthenticatedUser,
  ): Promise<TripMemberResponseDto> {
    // Only the creator passes this check, so `user` is the trip creator: they
    // already own the trip and must not also appear as a member.
    await this.access.assertIsCreator(dto.tripId, user.id);

    if (dto.userId === user.id) {
      throw new ConflictException(
        'The trip creator is already part of the trip and cannot be added as a member',
      );
    }

    return this.addMember(dto.tripId, dto.userId, dto.permission, user.id);
  }

  /**
   * Adds a user to a trip, once. Shared by the creator's invitation and by
   * joining with an invite code; callers are responsible for authorization.
   * `actorId` is who made it happen: the creator inviting, or the person
   * joining with a code.
   */
  async addMember(
    tripId: string,
    userId: string,
    permission: CreateTripMemberDto['permission'],
    actorId: string = userId,
  ): Promise<TripMemberResponseDto> {
    if (await this.repository.findByTripAndUser(tripId, userId)) {
      throw new ConflictException('This user is already a member of the trip');
    }

    const created = await this.repository.create({
      tripId,
      userId,
      permission,
    });
    this.events.publish({
      type: 'MEMBER_JOINED',
      tripId,
      actorId,
      subjectId: userId,
      details: { permission },
    });

    return TripMemberResponseDto.from(created);
  }

  async update(
    id: string,
    dto: UpdateTripMemberDto,
    user: AuthenticatedUser,
  ): Promise<TripMemberResponseDto> {
    const member = await this.getOrFail(id);
    await this.access.assertIsCreator(member.tripId, user.id);

    const updated = await this.repository.update(id, { ...dto });
    if (updated.permission !== member.permission) {
      this.events.publish({
        type: 'MEMBER_PERMISSION_CHANGED',
        tripId: member.tripId,
        actorId: user.id,
        subjectId: member.userId,
        details: { from: member.permission, to: updated.permission },
      });
    }

    return TripMemberResponseDto.from(updated);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const member = await this.getOrFail(id);
    await this.access.assertIsCreator(member.tripId, user.id);
    await this.repository.remove(id);
    this.events.publish({
      type: 'MEMBER_REMOVED',
      tripId: member.tripId,
      actorId: user.id,
      subjectId: member.userId,
      // No longer on the trip, but they should hear it.
      alsoNotify: [member.userId],
    });
  }

  private async getOrFail(id: string) {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(`TripMember with id "${id}" not found`);
    }

    return found;
  }
}
