import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { trim } from '../../farms/dto/create-farm.dto';

export class UploadRequestDocumentDto {
  @ApiProperty({ example: 'supporting_document_1', maxLength: 60 })
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  slotKey!: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  documentType?: string;
}

export class UploadRequestDocumentBodyDto extends UploadRequestDocumentDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file!: unknown;
}
