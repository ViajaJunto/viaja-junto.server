import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/http/dto/pagination-query.dto.js';

/** Query string of `GET /destination-reviews`: pagination plus the destination to scope to. */
export class ListDestinationReviewsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Only return the reviews of this catalog destination.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  @IsOptional()
  @IsUUID('4')
  destinationId?: string;
}
