import { ApiProperty } from '@nestjs/swagger';

/** Nest's default error shape (HttpException). */
export class ErrorResponseDto {
  @ApiProperty({ description: 'HTTP status code.', example: 404 })
  statusCode!: number;

  @ApiProperty({
    description: 'What went wrong, in plain words.',
    example: 'Trip with id "0b8f...-9c21" not found',
  })
  message!: string;

  @ApiProperty({
    description:
      'HTTP status name. Absent on a few framework errors, such as 429.',
    example: 'Not Found',
    required: false,
  })
  error?: string;
}

/**
 * 422 from the ValidationPipe: `message` holds one entry per violated rule.
 */
export class ValidationErrorResponseDto {
  @ApiProperty({ example: 422 })
  statusCode!: number;

  @ApiProperty({
    description: 'One entry per violated rule.',
    type: [String],
    example: [
      'name must be longer than or equal to 2 characters',
      'endDate must be a Date instance',
    ],
  })
  message!: string[];

  @ApiProperty({ example: 'Unprocessable Entity' })
  error!: string;
}
