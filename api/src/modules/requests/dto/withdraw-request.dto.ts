import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class WithdrawRequestDto {
  @ApiPropertyOptional({
    example: 'No longer seeking investment at this time.',
    description: 'Optional reason for withdrawal',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
