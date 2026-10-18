import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminUsersQueryDto {
  @ApiPropertyOptional({ enum: ['users', 'admins'], default: 'users' })
  @IsOptional()
  @IsIn(['users', 'admins'])
  tab?: 'users' | 'admins' = 'users';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter platform users by account_status' })
  @IsOptional()
  @IsString()
  accountStatus?: string;
}

export class AdminUserRowDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  fullName?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  mobile?: string | null;

  @ApiProperty()
  accountStatus!: string;

  @ApiProperty()
  createdAt!: string;
}

export class AdminAdministratorRowDto {
  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional()
  fullName?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  mobile?: string | null;

  @ApiProperty({ type: [String] })
  roles!: string[];

  @ApiProperty()
  hasCredential!: boolean;

  @ApiProperty()
  createdAt!: string;
}

export class AdminUsersListResponseDto {
  @ApiProperty({ type: [AdminUserRowDto] })
  userItems!: AdminUserRowDto[];

  @ApiProperty({ type: [AdminAdministratorRowDto] })
  adminItems!: AdminAdministratorRowDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
