import { Injectable, Logger, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { AuthSessionAudience } from '../../generated/prisma/enums';
import type { Env } from '../../config/env.validation';
import {
  REALTIME_NAMESPACE,
  REALTIME_SOCKET_PATH_DEFAULT,
  REALTIME_TICKET_CLEANUP_MS,
  REALTIME_TICKET_MAX_STORED,
  REALTIME_TICKET_TTL_MS,
  type RealtimeAudience,
} from './communication-realtime.constants';
import type { RealtimeSocketAuth } from './communication-realtime.types';
import type { RealtimeTicketResponseDto } from './dto/realtime-ticket.dto';

type TicketRecord = {
  userId: bigint;
  sessionId: bigint;
  audience: RealtimeAudience;
  expiresAt: number;
  used: boolean;
};

@Injectable()
export class CommunicationRealtimeTicketService implements OnModuleDestroy {
  private readonly logger = new Logger(CommunicationRealtimeTicketService.name);
  private readonly store = new Map<string, TicketRecord>();
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.cleanupTimer = setInterval(() => this.purgeExpired(), REALTIME_TICKET_CLEANUP_MS);
  }

  mint(userId: bigint, sessionId: bigint, audience: RealtimeAudience): RealtimeTicketResponseDto {
    if (this.store.size >= REALTIME_TICKET_MAX_STORED) {
      this.purgeExpired();
      if (this.store.size >= REALTIME_TICKET_MAX_STORED) {
        throw new ServiceUnavailableException('Realtime ticket service is busy');
      }
    }
    const ticket = randomBytes(32).toString('base64url');
    const hash = this.hashTicket(ticket);
    const expiresAt = Date.now() + REALTIME_TICKET_TTL_MS;
    this.store.set(hash, { userId, sessionId, audience, expiresAt, used: false });
    const path = this.config.get('SOCKET_IO_PATH', { infer: true }) ?? REALTIME_SOCKET_PATH_DEFAULT;
    return {
      ticket,
      expiresAt: new Date(expiresAt).toISOString(),
      namespace: REALTIME_NAMESPACE,
      path,
    };
  }

  /**
   * Consumes a single-use ticket. Returns auth context or null (invalid/expired/replayed/wrong audience).
   * In-memory only: tickets are lost on process restart and are not shared across API instances.
   */
  consume(ticket: string, expectedAudience: RealtimeAudience): RealtimeSocketAuth | null {
    if (!ticket || ticket.length > 128) return null;
    const hash = this.hashTicket(ticket);
    const record = this.store.get(hash);
    if (!record || record.used || record.expiresAt <= Date.now()) {
      if (record) this.store.delete(hash);
      return null;
    }
    if (record.audience !== expectedAudience) return null;
    record.used = true;
    this.store.delete(hash);
    return { userId: record.userId, sessionId: record.sessionId, audience: record.audience };
  }

  /** Test-only: inspect store size. */
  pendingCount(): number {
    return this.store.size;
  }

  private hashTicket(ticket: string): string {
    return createHash('sha256').update(ticket).digest('hex');
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [hash, row] of this.store) {
      if (row.expiresAt <= now || row.used) this.store.delete(hash);
    }
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
    this.store.clear();
  }
}

export function isRealtimeAudience(value: unknown): value is RealtimeAudience {
  return value === AuthSessionAudience.website || value === AuthSessionAudience.dashboard;
}
