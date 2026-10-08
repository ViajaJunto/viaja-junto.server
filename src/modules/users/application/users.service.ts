import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PaginatedResponseDto } from '../../../shared/http/dto/paginated-response.dto.js';
import { buildPaginationMeta } from '../../../shared/http/dto/paginated-response.dto.js';
import type { PaginationQueryDto } from '../../../shared/http/dto/pagination-query.dto.js';
import { toPageRequest } from '../../../shared/http/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.entity.js';
import type { GoogleUserData } from '../domain/user.repository.js';
import { UserRepository } from '../domain/user.repository.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly repository: UserRepository) {}

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    const { page, limit, skip, take } = toPageRequest(query);
    const { items, total } = await this.repository.findAll({ skip, take });

    return {
      data: items.map((item) => UserResponseDto.from(item)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    return UserResponseDto.from(await this.getOrFail(id));
  }

  /**
   * Resolves the account behind a Google sign-in, creating it on first use.
   *
   * Lookup order: the Google id first, since it never changes; then the email,
   * which links an account created before Google sign-in existed. The caller
   * must only pass emails Google has verified, otherwise anyone could claim an
   * existing account by registering its address with Google.
   */
  async findOrCreateFromGoogle(
    identity: GoogleUserData,
  ): Promise<UserResponseDto> {
    const linked = await this.repository.findByGoogleId(identity.googleId);
    if (linked) {
      return UserResponseDto.from(linked);
    }

    const byEmail = await this.repository.findByEmail(identity.email);
    if (byEmail) {
      return UserResponseDto.from(
        await this.repository.update(byEmail.id, {
          googleId: identity.googleId,
        }),
      );
    }

    return UserResponseDto.from(
      await this.repository.create({
        name: identity.name,
        email: identity.email,
        googleId: identity.googleId,
      }),
    );
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    this.assertSelf(id, user);
    await this.getOrFail(id);

    return UserResponseDto.from(await this.repository.update(id, { ...dto }));
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    this.assertSelf(id, user);
    await this.getOrFail(id);
    await this.repository.remove(id);
  }

  /** An account can only be changed or deleted by its own owner. */
  private assertSelf(id: string, user: AuthenticatedUser): void {
    if (id !== user.id) {
      throw new ForbiddenException('You can only change your own account');
    }
  }

  private async getOrFail(id: string) {
    const found = await this.repository.findById(id);

    if (!found) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    return found;
  }
}
