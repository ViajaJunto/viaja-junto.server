import { ApiProperty } from '@nestjs/swagger';

/** The code a trip creator shares so other users can join. */
export class InviteCodeResponseDto {
  @ApiProperty({
    description: 'Short invite code, case-insensitive.',
    example: 'K7M2QX9P',
    minLength: 8,
    maxLength: 8,
  })
  code!: string;
}
