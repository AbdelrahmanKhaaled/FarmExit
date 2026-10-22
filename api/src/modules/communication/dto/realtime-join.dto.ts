import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class RealtimeJoinCaseDto {
  @ApiProperty({ example: '42' })
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  caseId!: string;
}
