import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../modules/auth/domain/authenticated-user.entity.js';

/** Only the author may change or delete their own review. */
export function assertAuthor(
  review: { userId: string },
  user: AuthenticatedUser,
): void {
  if (review.userId !== user.id) {
    throw new ForbiddenException('Only the author can change this review');
  }
}
