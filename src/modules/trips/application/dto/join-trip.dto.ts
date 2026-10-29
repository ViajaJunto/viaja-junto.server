import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { INVITE_CODE_PATTERN } from '../../domain/invite-code.js';

/** Request body for joining a trip with its invite code. */
export class JoinTripDto {
  @ApiProperty({
    description:
      'The invite code the trip creator shared. Case-insensitive; the caller joins as a VIEWER.',
    example: 'K7M2QX9P',
  })
  @Matches(INVITE_CODE_PATTERN, { message: 'code is not a valid invite code' })
  code!: string;
}
