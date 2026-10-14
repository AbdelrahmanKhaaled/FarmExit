import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class ForwardRequestDto {
  @ApiProperty({
    example: '5',
    description: 'User ID of the recipient party (e.g. farm owner) to whom FarmExit forwards the mediated request',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+$/, { message: 'recipientUserId must be a numeric ID string' })
  recipientUserId!: string;

  @ApiPropertyOptional({
    example: 'Forwarding vetted purchase proposal with standard installment structure.',
    description: 'Internal staff notes associated with the forwarding action (never exposed to requester or owner)',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  internalNotes?: string;
}
