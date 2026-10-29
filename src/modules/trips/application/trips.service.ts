import { randomInt } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import { TripMembersService } from '../../trip-members/application/trip-members.service.js';
import { TripAccessService } from '../../trip-access/application/trip-access.service.js';
import { TripRepository } from '../domain/trip.repository.js';
import type { TripRole as AccessRole } from '../../trip-access/domain/trip-access.repository.js';
import type { TripRole } from '../domain/trip.entity.js';
import { DEFAULT_CURRENCY } from '../../../shared/domain/currency.js';
import {
  generateInviteCode,
  normalizeInviteCode,
} from '../domain/invite-code.js';
import { validateTripDates } from '../domain/trip-dates.js';
import { InviteCodeResponseDto } from './dto/invite-code-response.dto.js';
import { JoinTripDto } from './dto/join-trip.dto.js';
import { ListTripsQueryDto } from './dto/list-trips-query.dto.js';
import { CreateTripDto } from './dto/create-trip.dto.js';
import { UpdateTripDto } from './dto/update-trip.dto.js';
import { TripResponseDto } from './dto/trip-response.dto.js';

/** The trip-access policy calls the creator CREATOR; the API calls it OWNER. */
const toTripRole = (role: AccessRole): TripRole =>
  role === 'CREATOR' ? 'OWNER' : role;

@Injectable()
export class TripsService {
  constructor(
    private readonly repository: TripRepository,
    private readonly access: TripAccessService,
    private readonly members: TripMembersService,
  ) {}

  async findAll(
    query: ListTripsQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<TripResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll(
      { skip, take },
      user.id,
      { status: query.status },
    );

    return {
      data: items.map((item) => TripResponseDto.from(item, item.role)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<TripResponseDto> {
    const role = await this.access.assertCanRead(id, user.id);

    return TripResponseDto.from(await this.getOrFail(id), toTripRole(role));
  }

  async create(
    dto: CreateTripDto,
    user: AuthenticatedUser,
  ): Promise<TripResponseDto> {
    this.assertValidDates(dto);

    return TripResponseDto.from(
      await this.repository.create({
        ...dto,
        createdBy: user.id,
        currency: dto.currency ?? DEFAULT_CURRENCY,
        inviteCode: generateInviteCode(randomInt),
        status: dto.status ?? 'PLANNING',
      }),
      'OWNER',
    );
  }

  async update(
    id: string,
    dto: UpdateTripDto,
    user: AuthenticatedUser,
  ): Promise<TripResponseDto> {
    await this.access.assertIsCreator(id, user.id);
    const current = await this.getOrFail(id);
    this.assertValidDates({
      startDate: dto.startDate ?? current.startDate,
      endDate: dto.endDate ?? current.endDate,
    });

    return TripResponseDto.from(
      await this.repository.update(id, { ...dto }),
      'OWNER',
    );
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.access.assertIsCreator(id, user.id);
    await this.repository.remove(id);
  }

  async getInviteCode(
    id: string,
    user: AuthenticatedUser,
  ): Promise<InviteCodeResponseDto> {
    await this.access.assertIsCreator(id, user.id);

    return { code: (await this.getOrFail(id)).inviteCode };
  }

  /** Replaces the code, so the old one stops working. Creator only. */
  async regenerateInviteCode(
    id: string,
    user: AuthenticatedUser,
  ): Promise<InviteCodeResponseDto> {
    await this.access.assertIsCreator(id, user.id);
    const { inviteCode } = await this.repository.update(id, {
      inviteCode: generateInviteCode(randomInt),
    });

    return { code: inviteCode };
  }

  /** Joins the trip behind an invite code as a VIEWER. */
  async join(
    dto: JoinTripDto,
    user: AuthenticatedUser,
  ): Promise<TripResponseDto> {
    const trip = await this.repository.findByInviteCode(
      normalizeInviteCode(dto.code),
    );

    if (!trip) {
      throw new NotFoundException('Invalid invite code');
    }
    if (trip.createdBy === user.id) {
      throw new ConflictException(
        'You created this trip, so you are already in it',
      );
    }

    await this.members.addMember(trip.id, user.id, 'VIEWER');

    return TripResponseDto.from(trip, 'VIEWER');
  }

  private assertValidDates(dates: Parameters<typeof validateTripDates>[0]) {
    const errors = validateTripDates(dates);

    if (errors.length > 0) {
      throw new UnprocessableEntityException(errors);
    }
  }

  private async getOrFail(id: string) {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(`Trip with id "${id}" not found`);
    }

    return found;
  }
}
