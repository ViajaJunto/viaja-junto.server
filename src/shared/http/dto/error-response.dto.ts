import { ApiProperty } from '@nestjs/swagger';

/** Nest's default error shape (HttpException). */
export class ErrorResponseDto {
  @ApiProperty({ description: 'Codigo HTTP.', example: 404 })
  statusCode!: number;

  @ApiProperty({
    description: 'Mensagem descrevendo o erro.',
    example: 'Trip with id "0b8f...-9c21" not found',
  })
  message!: string;

  @ApiProperty({ description: 'Nome do status HTTP.', example: 'Not Found' })
  error!: string;
}

/**
 * 422 from the ValidationPipe: `message` holds one entry per violated rule.
 */
export class ValidationErrorResponseDto {
  @ApiProperty({ example: 422 })
  statusCode!: number;

  @ApiProperty({
    description: 'Uma entrada por regra de validacao violada.',
    type: [String],
    example: [
      'email must be an email',
      'password must be longer than or equal to 8 characters',
    ],
  })
  message!: string[];

  @ApiProperty({ example: 'Unprocessable Entity' })
  error!: string;
}
