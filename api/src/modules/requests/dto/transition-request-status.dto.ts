import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class TransitionRequestStatusDto {
  @ApiProperty({
    example: 'closed',
    description: 'Target request status compliant with the request type status flow',
  })
  @IsNotEmpty()
  @IsString()
  status!: string;

  @ApiPropertyOptional({
    example: 'Application closed due to applicant request.',
    description: 'Reason for status transition',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
