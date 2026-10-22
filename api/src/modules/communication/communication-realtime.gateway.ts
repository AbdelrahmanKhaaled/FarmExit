import { UsePipes, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AccountStatus, AuthSessionAudience } from '../../generated/prisma/enums';
import { NodeEnv, type Env } from '../../config/env.validation';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunicationAccessService } from './communication-access.service';
import { CommunicationRealtimePublisher } from './communication-realtime.publisher';
import {
  REALTIME_NAMESPACE,
  REALTIME_SESSION_REVALIDATE_MS,
  type RealtimeAudience,
  caseStaffRoom,
  convRoom,
} from './communication-realtime.constants';
import { CommunicationRealtimeTicketService, isRealtimeAudience } from './communication-realtime-ticket.service';
import type { RealtimeSocketAuth, RealtimeSocketData } from './communication-realtime.types';
import { RealtimeJoinCaseDto } from './dto/realtime-join.dto';

function socketData(client: Socket): RealtimeSocketData {
  return client.data as RealtimeSocketData;
}

function readHandshakeTicketAuth(
  handshake: Socket['handshake'],
): { ticket: string; audience: RealtimeAudience } | null {
  const raw = handshake.auth as Record<string, unknown> | undefined;
  const ticket = raw?.ticket;
  const audience = raw?.audience;
  if (typeof ticket !== 'string' || !isRealtimeAudience(audience)) return null;
  return { ticket, audience };
}

@WebSocketGateway({
  namespace: REALTIME_NAMESPACE,
  cors: { origin: false, credentials: true },
})
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class CommunicationRealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private allowedOrigins: Set<string> = new Set();

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly tickets: CommunicationRealtimeTicketService,
    private readonly prisma: PrismaService,
    private readonly access: CommunicationAccessService,
    private readonly publisher: CommunicationRealtimePublisher,
  ) {}

  afterInit(server: Server): void {
    const origins = this.config.get('CORS_ORIGINS', { infer: true });
    this.allowedOrigins = new Set(origins);
    this.publisher.attachServer(server);
  }

  handleConnection(client: Socket): Promise<void> {
    const ready = this.authenticateConnection(client);
    socketData(client).authReady = ready;
    return ready;
  }

  private async authenticateConnection(client: Socket): Promise<void> {
    if (!this.isOriginAllowed(client)) {
      client.disconnect(true);
      return;
    }
    const handshakeAuth = readHandshakeTicketAuth(client.handshake);
    if (!handshakeAuth) {
      client.disconnect(true);
      return;
    }
    const auth = this.tickets.consume(handshakeAuth.ticket, handshakeAuth.audience);
    if (!auth) {
      client.disconnect(true);
      return;
    }
    if (!(await this.isSessionLive(auth))) {
      client.disconnect(true);
      return;
    }
    const data = socketData(client);
    data.auth = auth;
    const interval =
      this.config.get('REALTIME_SESSION_REVALIDATE_MS', { infer: true }) ?? REALTIME_SESSION_REVALIDATE_MS;
    data.revalidateTimer = setInterval(() => {
      void this.revalidateSocket(client);
    }, interval);
  }

  handleDisconnect(client: Socket): void {
    const data = socketData(client);
    if (data.revalidateTimer) clearInterval(data.revalidateTimer);
    data.auth = undefined;
  }

  @SubscribeMessage('conv.join')
  async convJoin(@ConnectedSocket() client: Socket, @MessageBody() body: RealtimeJoinCaseDto) {
    await socketData(client).authReady;
    const auth = this.requireWebsite(client);
    if (!(await this.isSessionLive(auth))) throw new WsException('UNAUTHORIZED');
    const caseId = BigInt(body.caseId);
    const caseRow = await this.prisma.communicationCase.findUnique({ where: { id: caseId } });
    if (!caseRow) throw new WsException('NOT_FOUND');
    await this.access.assertCaseParticipant(auth.userId, caseRow);
    const conversation = await this.prisma.conversation.findFirst({
      where: { caseId, externalUserId: auth.userId },
    });
    if (!conversation) throw new WsException('FORBIDDEN');
    await client.join(convRoom(conversation.id));
    return { ok: true, conversationId: conversation.id.toString(), caseId: body.caseId };
  }

  @SubscribeMessage('conv.leave')
  async convLeave(@ConnectedSocket() client: Socket, @MessageBody() body: RealtimeJoinCaseDto) {
    await socketData(client).authReady;
    const auth = this.requireWebsite(client);
    const caseId = BigInt(body.caseId);
    const conversation = await this.prisma.conversation.findFirst({
      where: { caseId, externalUserId: auth.userId },
    });
    if (conversation) await client.leave(convRoom(conversation.id));
    return { ok: true };
  }

  @SubscribeMessage('case.join')
  async caseJoin(@ConnectedSocket() client: Socket, @MessageBody() body: RealtimeJoinCaseDto) {
    await socketData(client).authReady;
    const auth = this.requireDashboard(client);
    if (!(await this.isSessionLive(auth))) throw new WsException('UNAUTHORIZED');
    const caseId = BigInt(body.caseId);
    const caseRow = await this.prisma.communicationCase.findUnique({ where: { id: caseId } });
    if (!caseRow) throw new WsException('NOT_FOUND');
    await this.access.assertStaffCaseAccess(auth.userId, caseRow);
    await client.join(caseStaffRoom(caseId));
    return { ok: true, caseId: body.caseId };
  }

  @SubscribeMessage('case.leave')
  async caseLeave(@ConnectedSocket() client: Socket, @MessageBody() body: RealtimeJoinCaseDto) {
    await socketData(client).authReady;
    this.requireDashboard(client);
    await client.leave(caseStaffRoom(body.caseId));
    return { ok: true };
  }

  private requireWebsite(client: Socket): RealtimeSocketAuth {
    const auth = socketData(client).auth;
    if (!auth || auth.audience !== AuthSessionAudience.website) throw new WsException('FORBIDDEN');
    return auth;
  }

  private requireDashboard(client: Socket): RealtimeSocketAuth {
    const auth = socketData(client).auth;
    if (!auth || auth.audience !== AuthSessionAudience.dashboard) throw new WsException('FORBIDDEN');
    return auth;
  }

  private async isSessionLive(auth: RealtimeSocketAuth): Promise<boolean> {
    const session = await this.prisma.userSession.findUnique({
      where: { id: auth.sessionId },
      include: { user: true },
    });
    if (
      !session ||
      session.userId !== auth.userId ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now() ||
      session.authAudience !== auth.audience ||
      session.user.accountStatus !== AccountStatus.active
    ) {
      return false;
    }
    return true;
  }

  private async revalidateSocket(client: Socket): Promise<void> {
    const auth = socketData(client).auth;
    if (!auth) {
      client.disconnect(true);
      return;
    }
    if (!(await this.isSessionLive(auth))) {
      client.disconnect(true);
      return;
    }
    if (!(await this.revalidateJoinedRooms(client, auth))) {
      client.disconnect(true);
    }
  }

  /** Re-check case/conversation authorization for every joined realtime room. */
  private async revalidateJoinedRooms(client: Socket, auth: RealtimeSocketAuth): Promise<boolean> {
    const rooms = [...client.rooms].filter((id) => id !== client.id);
    if (rooms.length === 0) return true;

    for (const room of rooms) {
      const convMatch = /^conv:(\d+)$/.exec(room);
      if (convMatch) {
        if (auth.audience !== AuthSessionAudience.website) return false;
        const convId = BigInt(convMatch[1]);
        const conv = await this.prisma.conversation.findUnique({
          where: { id: convId },
          include: { case: true },
        });
        if (!conv || conv.externalUserId !== auth.userId) return false;
        try {
          await this.access.assertCaseParticipant(auth.userId, conv.case);
        } catch {
          return false;
        }
        continue;
      }

      const staffMatch = /^case:(\d+):staff$/.exec(room);
      if (staffMatch) {
        if (auth.audience !== AuthSessionAudience.dashboard) return false;
        const caseId = BigInt(staffMatch[1]);
        const caseRow = await this.prisma.communicationCase.findUnique({ where: { id: caseId } });
        if (!caseRow) return false;
        try {
          await this.access.assertStaffCaseAccess(auth.userId, caseRow);
        } catch {
          return false;
        }
      }
    }
    return true;
  }

  private isOriginAllowed(client: Socket): boolean {
    const origin = client.handshake.headers.origin;
    if (!origin) return this.config.get('NODE_ENV', { infer: true }) !== NodeEnv.Production;
    return this.allowedOrigins.has(origin);
  }
}
