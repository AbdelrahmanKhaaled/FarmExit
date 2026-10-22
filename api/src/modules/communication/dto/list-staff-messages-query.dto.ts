import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { ListFarmsQueryDto } from '../../farms/dto/list-farms-query.dto';

export class ListStaffMessagesQueryDto extends ListFarmsQueryDto {
  @ApiPropertyOptional({ description: 'Conversation inside the authorized case' })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d{0,18}$/)
  conversationId?: string;
}
