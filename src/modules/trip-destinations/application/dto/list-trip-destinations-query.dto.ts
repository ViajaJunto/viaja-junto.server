import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/http/dto/pagination-query.dto.js';

/** Query string of the list endpoint: pagination plus the parent to scope to. */
export class ListTripDestinationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Only return the trip whose itinerary to list, ordered by `order`.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @IsOptional()
  @IsUUID('4')
  tripId?: string;
}
