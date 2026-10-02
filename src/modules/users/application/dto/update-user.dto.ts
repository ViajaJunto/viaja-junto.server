import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

/** Request body for updating a user. Every field is optional. */
export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Full name shown to other trip members.',
    example: 'Gustavo Fidelis',
    minLength: 2,
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @ApiPropertyOptional({
    description: 'Contact address used to receive trip invitations.',
    example: 'gustavo@exemplo.com',
    format: 'email',
    maxLength: 255,
  })
  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid address' })
  @MaxLength(255)
  email?: string;
}
