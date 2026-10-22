import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { AuthSessionAudience, AccountStatus } from '../../generated/prisma/enums';
import { CommunicationRealtimeGateway } from './communication-realtime.gateway';
import { convRoom, caseStaffRoom } from './communication-realtime.constants';

describe('CommunicationRealtimeGateway', () => {
  const tickets = { consume: jest.fn() };
  const access = {
    assertCaseParticipant: jest.fn(),
    assertStaffCaseAccess: jest.fn(),
  };
  const prisma = {
    communicationCase: { findUnique: jest.fn() },
    conversation: { findFirst: jest.fn(), findUnique: jest.fn() },
    userSession: { findUnique: jest.fn() },
  };
  const publisher = { attachServer: jest.fn() };
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'CORS_ORIGINS') return ['http://localhost:3000'];
      if (key === 'NODE_ENV') return 'test';
      if (key === 'SOCKET_IO_PATH') return '/socket.io';
      if (key === 'REALTIME_SESSION_REVALIDATE_MS') return 30_000;
      return undefined;
    }),
  } as unknown as ConfigService;

  let gateway: CommunicationRealtimeGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new CommunicationRealtimeGateway(
      config,
      tickets as never,
      prisma as never,
      access as never,
      publisher as never,
    );
  });

  function websiteSocket() {
    return {
      data: {
        auth: { userId: 7n, sessionId: 8n, audience: AuthSessionAudience.website },
      },
      join: jest.fn(),
      leave: jest.fn(),
      disconnect: jest.fn(),
    };
  }

  function dashboardSocket() {
    return {
      data: {
        auth: { userId: 2n, sessionId: 3n, audience: AuthSessionAudience.dashboard },
      },
      join: jest.fn(),
      leave: jest.fn(),
      disconnect: jest.fn(),
    };
  }

  it('website user cannot join staff room via case.join', async () => {
    const client = websiteSocket();
    prisma.userSession.findUnique.mockResolvedValue({
      userId: 7n,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      authAudience: AuthSessionAudience.website,
      user: { accountStatus: AccountStatus.active },
    });
    await expect(gateway.caseJoin(client as never, { caseId: '1' })).rejects.toBeInstanceOf(WsException);
  });

  it('authorized user joins only their conversation room', async () => {
    const client = websiteSocket();
    prisma.communicationCase.findUnique.mockResolvedValue({ id: 1n });
    access.assertCaseParticipant.mockResolvedValue(undefined);
    prisma.conversation.findFirst.mockResolvedValue({ id: 99n });
    prisma.userSession.findUnique.mockResolvedValue({
      userId: 7n,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      authAudience: AuthSessionAudience.website,
      user: { accountStatus: AccountStatus.active },
    });
    const ack = await gateway.convJoin(client as never, { caseId: '1' });
    expect(client.join).toHaveBeenCalledWith(convRoom(99n));
    expect(ack).toEqual({ ok: true, conversationId: '99', caseId: '1' });
  });

  it('unauthorized user cannot join another conversation', async () => {
    const client = websiteSocket();
    prisma.communicationCase.findUnique.mockResolvedValue({ id: 1n });
    access.assertCaseParticipant.mockRejectedValue(new ForbiddenException());
    prisma.userSession.findUnique.mockResolvedValue({
      userId: 7n,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      authAudience: AuthSessionAudience.website,
      user: { accountStatus: AccountStatus.active },
    });
    await expect(gateway.convJoin(client as never, { caseId: '1' })).rejects.toBeDefined();
  });

  it('authorized staff joins staff case room', async () => {
    const client = dashboardSocket();
    prisma.communicationCase.findUnique.mockResolvedValue({ id: 4n });
    access.assertStaffCaseAccess.mockResolvedValue(undefined);
    prisma.userSession.findUnique.mockResolvedValue({
      userId: 2n,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      authAudience: AuthSessionAudience.dashboard,
      user: { accountStatus: AccountStatus.active },
    });
    const ack = await gateway.caseJoin(client as never, { caseId: '4' });
    expect(client.join).toHaveBeenCalledWith(caseStaffRoom(4n));
    expect(ack).toEqual({ ok: true, caseId: '4' });
  });

  it('disconnects when session is revoked on revalidation', async () => {
    const client = websiteSocket();
    prisma.userSession.findUnique.mockResolvedValue({
      userId: 7n,
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      authAudience: AuthSessionAudience.website,
      user: { accountStatus: AccountStatus.active },
    });
    await (gateway as unknown as { revalidateSocket: (c: unknown) => Promise<void> }).revalidateSocket(client);
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('disconnects when staff loses case access during revalidation', async () => {
    const socketId = 'sock-1';
    const client = {
      ...dashboardSocket(),
      id: socketId,
      rooms: new Set([socketId, caseStaffRoom(4n)]),
    };
    prisma.userSession.findUnique.mockResolvedValue({
      userId: 2n,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      authAudience: AuthSessionAudience.dashboard,
      user: { accountStatus: AccountStatus.active },
    });
    prisma.communicationCase.findUnique.mockResolvedValue({ id: 4n, requestId: 1n, assignedStaffId: 9n });
    access.assertStaffCaseAccess.mockRejectedValue(new ForbiddenException());
    await (gateway as unknown as { revalidateSocket: (c: unknown) => Promise<void> }).revalidateSocket(client);
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('disconnects when website participant loses case access in joined conv room', async () => {
    const socketId = 'sock-2';
    const client = {
      ...websiteSocket(),
      id: socketId,
      rooms: new Set([socketId, convRoom(99n)]),
    };
    prisma.userSession.findUnique.mockResolvedValue({
      userId: 7n,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      authAudience: AuthSessionAudience.website,
      user: { accountStatus: AccountStatus.active },
    });
    prisma.conversation.findUnique.mockResolvedValue({
      id: 99n,
      externalUserId: 7n,
      case: { id: 1n, requestId: 2n },
    });
    access.assertCaseParticipant.mockRejectedValue(new ForbiddenException());
    await (gateway as unknown as { revalidateSocket: (c: unknown) => Promise<void> }).revalidateSocket(client);
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('rejects connection when ticket consume fails', async () => {
    tickets.consume.mockReturnValue(null);
    const client = {
      handshake: {
        auth: { ticket: 'bad', audience: AuthSessionAudience.website },
        headers: { origin: 'http://localhost:3000' },
      },
      disconnect: jest.fn(),
      data: {},
    };
    await gateway.handleConnection(client as never);
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('waits for session authentication when the client joins immediately after connect', async () => {
    gateway.afterInit({} as never);
    tickets.consume.mockReturnValue({ userId: 7n, sessionId: 8n, audience: AuthSessionAudience.website });
    const session = {
      userId: 7n,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      authAudience: AuthSessionAudience.website,
      user: { accountStatus: AccountStatus.active },
    };
    let authenticate!: (value: typeof session) => void;
    prisma.userSession.findUnique
      .mockReturnValueOnce(
        new Promise((resolve) => {
          authenticate = resolve;
        }),
      )
      .mockResolvedValue(session);
    prisma.communicationCase.findUnique.mockResolvedValue({ id: 1n });
    access.assertCaseParticipant.mockResolvedValue(undefined);
    prisma.conversation.findFirst.mockResolvedValue({ id: 99n });
    const client = {
      handshake: { auth: { ticket: 'valid', audience: 'website' }, headers: { origin: 'http://localhost:3000' } },
      data: {},
      join: jest.fn(),
      disconnect: jest.fn(),
    };
    const connecting = gateway.handleConnection(client as never);
    const joining = gateway.convJoin(client as never, { caseId: '1' });
    expect(client.join).not.toHaveBeenCalled();
    authenticate(session);
    await connecting;
    await expect(joining).resolves.toEqual({ ok: true, conversationId: '99', caseId: '1' });
    gateway.handleDisconnect(client as never);
  });
});
