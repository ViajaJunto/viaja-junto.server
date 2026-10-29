import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/http/dto/pagination-query.dto.js';

/** Query string of `GET /reviews`: pagination plus the activity to scope to. */
export class ListReviewsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Only return the reviews of this catalog activity.',
    format: 'uuid',
    example: 'c48a1f60-7b22-4d19-9e33-5a0b6d2c8f41',
  })
  @IsOptional()
  @IsUUID('4')
  activityId?: string;
}
