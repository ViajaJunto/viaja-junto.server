/** A review as shown on a public catalog page: the author is just a name. */
export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  authorName: string;
}
