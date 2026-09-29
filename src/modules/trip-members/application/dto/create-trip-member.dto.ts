import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';

/** Request body for creating a trip member. */
export class CreateTripMemberDto {
  @ApiProperty({
    description: 'Trip the user is being added to.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @IsUUID('4')
  tripId!: string;

  @ApiProperty({
    description: 'User being invited.',
    format: 'uuid',
    example: '9c3d1b7a-2e55-4f10-8a6b-1d7c2f9e4b33',
  })
  @IsUUID('4')
  userId!: string;

  @ApiProperty({
    description:
      'EDITOR can change the itinerary; VIEWER has read-only access.',
    enum: ['EDITOR', 'VIEWER'],
    example: 'EDITOR',
  })
  @IsIn(['EDITOR', 'VIEWER'])
  permission!: 'EDITOR' | 'VIEWER';
}
