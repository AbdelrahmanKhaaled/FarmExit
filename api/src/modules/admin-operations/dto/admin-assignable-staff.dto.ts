import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const ASSIGNABLE_ROLES = ['reviewer', 'caseAgent'] as const;

export class AdminAssignableStaffQueryDto {
  @ApiProperty({ enum: ASSIGNABLE_ROLES, description: 'Staff membership role required for the assignment slot' })
  @IsIn(ASSIGNABLE_ROLES)
  role!: (typeof ASSIGNABLE_ROLES)[number];

  @ApiPropertyOptional({ description: 'Filter by staff display name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class AdminAssignableStaffItemDto {
  @ApiProperty() userId!: string;
  @ApiPropertyOptional({ nullable: true }) fullName!: string | null;
  @ApiProperty({ enum: ASSIGNABLE_ROLES }) staffRole!: string;
}

export class AdminAssignableStaffListResponseDto {
  @ApiProperty({ type: [AdminAssignableStaffItemDto] }) items!: AdminAssignableStaffItemDto[];
}
