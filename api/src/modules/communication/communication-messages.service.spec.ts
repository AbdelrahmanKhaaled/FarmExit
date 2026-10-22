import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunicationAccessService } from './communication-access.service';
import { CommunicationMessagesService } from './communication-messages.service';
import { CommunicationRealtimePublisher } from './communication-realtime.publisher';

describe('CommunicationMessagesService', () => {
  let service: CommunicationMessagesService;
  const access = {
    assertStaffCaseAccess: jest.fn(),
    assertStaffMessageRecipient: jest.fn(),
    assertCaseParticipant: jest.fn(),
  };
  const prisma = {
    communicationCase: { findUnique: jest.fn() },
    message: { findUnique: jest.fn(), create: jest.fn(), count: jest.fn(), findMany: jest.fn() },
    conversation: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        message: { create: jest.fn().mockResolvedValue({ id: 9n, senderId: 2n, body: 'Relay', sentAt: new Date() }) },
        messageRelay: { create: jest.fn() },
        auditLog: { create: jest.fn() },
      }),
    ),
    auditLog: { create: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CommunicationMessagesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CommunicationAccessService, useValue: access },
        { provide: CommunicationRealtimePublisher, useValue: { messageCreated: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(CommunicationMessagesService);
  });

  it('rejects relay when source message belongs to another case', async () => {
    prisma.communicationCase.findUnique.mockResolvedValue({ id: 1n, status: 'open', requestId: 5n });
    access.assertStaffCaseAccess.mockResolvedValue(undefined);
    prisma.message.findUnique.mockResolvedValue({
      id: 3n,
      deletedAt: null,
      conversation: { caseId: 99n, externalUserId: 1n },
    });
    await expect(
      service.relayStaff(2n, 1n, { sourceMessageId: '3', targetExternalUserId: '4', body: 'Hi' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('publishes realtime event after successful user send', async () => {
    const realtime = { messageCreated: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        CommunicationMessagesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CommunicationAccessService, useValue: access },
        { provide: CommunicationRealtimePublisher, useValue: realtime },
      ],
    }).compile();
    const svc = moduleRef.get(CommunicationMessagesService);
    prisma.communicationCase.findUnique.mockResolvedValue({ id: 1n, status: 'open' });
    access.assertCaseParticipant.mockResolvedValue(undefined);
    prisma.conversation.findFirst.mockResolvedValue({ id: 11n });
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        message: {
          create: jest.fn().mockResolvedValue({
            id: 5n,
            senderId: 3n,
            body: 'Hi',
            sentAt: new Date('2026-01-01'),
          }),
        },
        auditLog: { create: jest.fn() },
      }),
    );
    await svc.sendUser(3n, 1n, { body: 'Hi' });
    expect(realtime.messageCreated).toHaveBeenCalledWith(
      expect.objectContaining({ caseId: '1', conversationId: '11' }),
    );
  });

  it('blocks staff send to unauthorized external user', async () => {
    prisma.communicationCase.findUnique.mockResolvedValue({ id: 1n, status: 'open', requestId: 5n });
    access.assertStaffCaseAccess.mockResolvedValue(undefined);
    access.assertStaffMessageRecipient.mockRejectedValue(new ForbiddenException());
    await expect(service.sendStaff(2n, 1n, 99n, { body: 'Hi' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
