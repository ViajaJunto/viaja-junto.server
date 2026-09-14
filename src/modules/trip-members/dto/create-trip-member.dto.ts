export class CreateTripMemberDto {
  tripId!: string;
  userId!: string;
  permission!: 'EDITOR' | 'VIEWER';
}
