import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { CommunicationCaseStatus } from '../../../generated/prisma/enums';
import { ListFarmsQueryDto } from '../../farms/dto/list-farms-query.dto';

export class ListCommunicationCasesQueryDto extends ListFarmsQueryDto {
  @ApiPropertyOptional({ enum: CommunicationCaseStatus })
  @IsOptional()
  @IsEnum(CommunicationCaseStatus)
  status?: CommunicationCaseStatus;

  @ApiPropertyOptional({ description: 'Filter by related request id' })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  requestId?: string;
}
