import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { CommunicationCaseStatus } from '../../../generated/prisma/enums';
import { trim } from '../../farms/dto/create-farm.dto';

export class OpenCommunicationCaseDto {
  @ApiProperty({ example: '42', description: 'Supported request id' })
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  requestId!: string;
}

export class SendMessageDto {
  @ApiProperty({ minLength: 1, maxLength: 8000 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body!: string;
}

export class RelayMessageDto {
  @ApiProperty({ example: '100', description: 'Source message id in this case' })
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  sourceMessageId!: string;

  @ApiProperty({ example: '55', description: 'External user who will receive the relayed message' })
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  targetExternalUserId!: string;

  @ApiProperty({ minLength: 1, maxLength: 8000, description: 'FarmExit-authored text delivered to the recipient' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body!: string;

  @ApiPropertyOptional({ maxLength: 4000, description: 'Internal relay note (not shown to the recipient)' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(4000)
  relayNote?: string;
}

export class UpdateCaseStatusDto {
  @ApiProperty({ enum: CommunicationCaseStatus })
  @IsEnum(CommunicationCaseStatus)
  status!: CommunicationCaseStatus;
}

export class MessageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() senderId!: string;
  @ApiProperty({ nullable: true, type: String }) body!: string | null;
  @ApiProperty({ nullable: true, type: String }) sentAt!: string | null;
  @ApiProperty() isRelayedCopy!: boolean;
}

export class MessageListResponseDto {
  @ApiProperty({ type: [MessageResponseDto] }) items!: MessageResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}

export class CommunicationCaseResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() requestId!: string;
  @ApiProperty() status!: string;
  @ApiProperty() assignedStaffId!: string;
  @ApiProperty({ nullable: true, type: String }) createdAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) closedAt!: string | null;
}

export class CommunicationCaseListResponseDto {
  @ApiProperty({ type: [CommunicationCaseResponseDto] }) items!: CommunicationCaseResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
}
