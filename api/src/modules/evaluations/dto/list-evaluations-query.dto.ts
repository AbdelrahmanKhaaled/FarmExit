import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { EvaluationStatus } from '../../../generated/prisma/enums';
import { ListFarmsQueryDto } from '../../farms/dto/list-farms-query.dto';

export class ListEvaluationsQueryDto extends ListFarmsQueryDto {
  @ApiPropertyOptional({ enum: EvaluationStatus, description: 'Optional status filter' })
  @IsOptional()
  @IsEnum(EvaluationStatus)
  status?: EvaluationStatus;
}
