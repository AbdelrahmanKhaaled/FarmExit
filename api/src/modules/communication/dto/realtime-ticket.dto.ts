import { ApiProperty } from '@nestjs/swagger';

export class RealtimeTicketResponseDto {
  @ApiProperty({ description: 'Single-use opaque ticket for Socket.IO handshake auth.ticket (60s TTL)' })
  ticket!: string;

  @ApiProperty({ example: '2026-10-21T12:00:00.000Z' })
  expiresAt!: string;

  @ApiProperty({ example: '/communication' })
  namespace!: string;

  @ApiProperty({ example: '/socket.io' })
  path!: string;
}
