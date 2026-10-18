import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConversationSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() externalUserId!: string;
  @ApiPropertyOptional() externalUserName!: string | null;
}
