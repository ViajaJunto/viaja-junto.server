import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UsersService } from '../../users/application/users.service.js';

/**
 * Who may change the shared destination and activity catalogs.
 *
 * The catalogs are curated data that every user and visitor reads, and that
 * trips reference. Only an ADMIN may create, edit (photo included) or delete
 * entries; everyone else just picks from them. The role is read from the
 * database on every call, so demoting an account takes effect without waiting
 * for its token to expire.
 */
@Injectable()
export class CatalogAccessService {
  constructor(private readonly users: UsersService) {}

  async assertAdmin(userId: string): Promise<void> {
    if ((await this.users.getRole(userId)) !== 'ADMIN') {
      throw new ForbiddenException(
        'Only an administrator can change the catalogs',
      );
    }
  }

  /**
   * Admin-only deletion of an entry that no trip references. `countUsages` is
   * only called for an admin, so regular users never learn whether it is used.
   */
  async assertCanDelete(
    userId: string,
    countUsages: () => Promise<number>,
  ): Promise<void> {
    await this.assertAdmin(userId);

    if ((await countUsages()) > 0) {
      throw new ConflictException(
        'This entry is used by trips and cannot be deleted',
      );
    }
  }
}
