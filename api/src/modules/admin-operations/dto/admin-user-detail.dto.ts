import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminUserFarmRelationshipDto {
  @ApiProperty() farmId!: string;
  @ApiProperty() farmName!: string;
  @ApiProperty() relationshipRole!: string;
}

export class AdminUserDetailDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() fullName?: string | null;
  @ApiPropertyOptional() email?: string | null;
  @ApiProperty() mobile!: string;
  @ApiProperty() accountStatus!: string;
  @ApiPropertyOptional() mobileVerifiedAt?: string | null;
  @ApiPropertyOptional() lastLoginAt?: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() requestsCreatedCount!: number;
  @ApiProperty({ type: [AdminUserFarmRelationshipDto] })
  farmRelationships!: AdminUserFarmRelationshipDto[];
}
