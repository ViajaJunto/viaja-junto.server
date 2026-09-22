import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';

/** Request body for creating a user. */
export class CreateUserDto {
  @ApiProperty({ description: 'Full name shown to other trip members.', example: 'Gustavo Fidelis', minLength: 2, maxLength: 120 })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ description: 'Unique address used to sign in and to receive trip invitations.', example: 'gustavo@exemplo.com', format: 'email', maxLength: 255 })
  @IsEmail({}, { message: 'email must be a valid address' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ description: 'Plain-text password, stored hashed. Never returned by the API.', example: 'umaSenhaForte123', minLength: 8, maxLength: 72, writeOnly: true })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
