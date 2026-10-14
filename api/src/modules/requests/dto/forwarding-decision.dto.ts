import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { OwnerDecision } from '../../../generated/prisma/enums';

export class ForwardingDecisionDto {
  @ApiProperty({
    enum: OwnerDecision,
    example: OwnerDecision.accepted,
    description: 'Decision on forwarded request: accepted or declined',
  })
  @IsNotEmpty()
  @IsEnum(OwnerDecision)
  decision!: OwnerDecision;

  @ApiPropertyOptional({
    example: 'Acceptable commercial terms; FarmExit staff may coordinate next steps.',
    description: 'Optional feedback or reason for decision',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
