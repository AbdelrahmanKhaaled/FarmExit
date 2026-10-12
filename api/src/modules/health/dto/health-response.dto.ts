import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', enum: ['ok'] })
  status: 'ok';

  @ApiProperty({ example: '2026-10-12T15:00:00.000Z', description: 'Server time (ISO 8601)' })
  timestamp: string;
}
