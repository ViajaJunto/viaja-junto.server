export class CreateReviewDto {
  userId!: string;
  activityId!: string;
  rating!: number;
  comment?: string;
}
