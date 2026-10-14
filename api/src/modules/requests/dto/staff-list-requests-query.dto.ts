import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';
import { ListRequestsQueryDto } from './list-requests-query.dto';

export class StaffListRequestsQueryDto extends ListRequestsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by assigned staff user ID', example: '2' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'assignedStaffId must be a numeric ID string' })
  assignedStaffId?: string;

  @ApiPropertyOptional({ description: 'Filter requests created on or after this UTC date (ISO 8601)', example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ description: 'Filter requests created on or before this UTC date (ISO 8601)', example: '2026-12-31T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  createdTo?: string;
}
