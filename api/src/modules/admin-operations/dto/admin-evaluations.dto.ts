import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminEvaluationsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farmId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class AdminEvaluationRowDto {
  @ApiProperty() id!: string;
  @ApiProperty() farmId!: string;
  @ApiProperty() farmName!: string;
  @ApiProperty() status!: string;
  @ApiPropertyOptional({ type: Number }) scoreValue!: number | null;
  @ApiPropertyOptional({ type: Number }) scoreMax!: number | null;
  @ApiPropertyOptional() reviewerName!: string | null;
  @ApiPropertyOptional() createdAt!: string | null;
}

export class AdminEvaluationListResponseDto {
  @ApiProperty({ type: [AdminEvaluationRowDto] }) items!: AdminEvaluationRowDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
