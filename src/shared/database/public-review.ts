import type { PublicReview } from '../domain/public-review.js';

/** The name only: the email of a reviewer is never public. */
export const publicReviewSelect = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  user: { select: { name: true } },
} as const;

type PublicReviewRow = Omit<PublicReview, 'authorName'> & {
  user: { name: string };
};

export const toPublicReviews = (rows: PublicReviewRow[]): PublicReview[] =>
  rows.map(({ user, ...review }) => ({ ...review, authorName: user.name }));
