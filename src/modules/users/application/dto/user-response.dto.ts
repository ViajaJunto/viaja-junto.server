import { ApiProperty } from '@nestjs/swagger';
import type { User } from '../../domain/user.entity.js';

/**
 * Response body for a user.
 *
 * Built explicitly from the domain entity instead of returning it directly,
 * so a new column never leaks into the API by accident.
 */
export class UserResponseDto {
  @ApiProperty({ description: 'Unique identifier.', format: 'uuid', example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' })
  id!: string;

  @ApiProperty({ description: 'Full name.', example: 'Gustavo Fidelis' })
  name!: string;

  @ApiProperty({ description: 'Sign-in address.', format: 'email', example: 'gustavo@exemplo.com' })
  email!: string;

  @ApiProperty({ description: 'When the account was created.', type: String, format: 'date-time', example: '2026-03-14T18:22:05.000Z' })
  createdAt!: Date;

  static from(entity: User): UserResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      createdAt: entity.createdAt,
    };
  }
}
