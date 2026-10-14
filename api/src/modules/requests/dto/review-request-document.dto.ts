import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewRequestDocumentDto {
  @ApiProperty({
    example: 'underReview',
    description: 'Document review status (e.g. uploaded, underReview, changesRequested, reviewed)',
  })
  @IsNotEmpty()
  @IsString()
  reviewStatus!: string;

  @ApiPropertyOptional({
    example: 'Clear title deed copy; ownership registration verified.',
    description: 'Staff review note regarding the document',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNote?: string;
}
