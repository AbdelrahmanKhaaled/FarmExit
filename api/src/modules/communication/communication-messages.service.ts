import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CommunicationCaseStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_PAGE_SIZE, type ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import { CommunicationAccessService } from './communication-access.service';
import type { MessageListResponseDto, MessageResponseDto, RelayMessageDto, SendMessageDto } from './dto/communication.dto';

const notFound = (): NotFoundException => new NotFoundException('Communication case not found');

@Injectable()
export class CommunicationMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CommunicationAccessService,
  ) {}

  async sendUser(userId: bigint, caseId: bigint, dto: SendMessageDto): Promise<MessageResponseDto> {
    const caseRow = await this.loadOpenCase(caseId);
    await this.access.assertCaseParticipant(userId, caseRow);
    const conversation = await this.prisma.conversation.findFirst({
      where: { caseId, externalUserId: userId },
    });
    if (!conversation) throw forbiddenConversation();

    const message = await this.prisma.$transaction(async (tx) => {
      const row = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userId,
          body: dto.body,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          entityType: 'message',
          entityId: row.id,
          action: 'message_sent',
          changes: { caseId: caseId.toString(), conversationId: conversation.id.toString() },
        },
      });
      return row;
    });
    return toMessage(message.id, message.senderId, message.body, message.sentAt, false);
  }

  async sendStaff(userId: bigint, caseId: bigint, externalUserId: bigint, dto: SendMessageDto): Promise<MessageResponseDto> {
    const caseRow = await this.loadOpenCase(caseId);
    await this.access.assertStaffCaseAccess(userId, caseRow);
    await this.access.assertStaffMessageRecipient(caseRow, externalUserId);
    const conversation = await this.ensureConversation(caseId, externalUserId);
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        body: dto.body,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        entityType: 'message',
        entityId: message.id,
        action: 'staff_message_sent',
        changes: { caseId: caseId.toString(), externalUserId: externalUserId.toString() },
      },
    });
    return toMessage(message.id, message.senderId, message.body, message.sentAt, false);
  }

  async relayStaff(userId: bigint, caseId: bigint, dto: RelayMessageDto): Promise<MessageResponseDto> {
    const caseRow = await this.loadOpenCase(caseId);
    await this.access.assertStaffCaseAccess(userId, caseRow);

    const sourceId = BigInt(dto.sourceMessageId);
    const targetUserId = BigInt(dto.targetExternalUserId);
    const source = await this.prisma.message.findUnique({
      where: { id: sourceId },
      include: { conversation: true },
    });
    if (!source || source.conversation.caseId !== caseId) {
      throw new NotFoundException('Source message not found in this case');
    }
    if (source.deletedAt) throw new BadRequestException('Cannot relay a deleted message');
    if (targetUserId === source.conversation.externalUserId) {
      throw new BadRequestException('Relay target must be a different external participant');
    }
    await this.access.assertStaffMessageRecipient(caseRow, targetUserId);

    const targetConv = await this.ensureConversation(caseId, targetUserId);
    const relayed = await this.prisma.$transaction(async (tx) => {
      const relayedMessage = await tx.message.create({
        data: {
          conversationId: targetConv.id,
          senderId: userId,
          body: dto.body,
        },
      });
      await tx.messageRelay.create({
        data: {
          sourceMessageId: sourceId,
          relayedMessageId: relayedMessage.id,
          relayedBy: userId,
          relayNote: dto.relayNote?.trim() || null,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          entityType: 'message_relay',
          entityId: relayedMessage.id,
          action: 'message_relayed',
          changes: {
            caseId: caseId.toString(),
            sourceMessageId: sourceId.toString(),
            targetExternalUserId: targetUserId.toString(),
          },
        },
      });
      return relayedMessage;
    });
    return toMessage(relayed.id, relayed.senderId, relayed.body, relayed.sentAt, true);
  }

  async listUser(userId: bigint, caseId: bigint, query: ListFarmsQueryDto): Promise<MessageListResponseDto> {
    const caseRow = await this.prisma.communicationCase.findUnique({ where: { id: caseId } });
    if (!caseRow) throw notFound();
    await this.access.assertCaseParticipant(userId, caseRow);
    const conversation = await this.prisma.conversation.findFirst({
      where: { caseId, externalUserId: userId },
    });
    if (!conversation) return { items: [], page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 };
    return this.listConversationMessages(conversation.id, query, userId);
  }

  async listStaff(
    userId: bigint,
    caseId: bigint,
    query: ListFarmsQueryDto,
    conversationId?: bigint,
  ): Promise<MessageListResponseDto> {
    const caseRow = await this.prisma.communicationCase.findUnique({ where: { id: caseId } });
    if (!caseRow) throw notFound();
    await this.access.assertStaffCaseAccess(userId, caseRow);
    if (conversationId) {
      const conv = await this.prisma.conversation.findFirst({ where: { id: conversationId, caseId } });
      if (!conv) throw new NotFoundException('Conversation not found');
      return this.listConversationMessages(conversationId, query, userId, true);
    }
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const convs = await this.prisma.conversation.findMany({ where: { caseId }, select: { id: true } });
    const convIds = convs.map((c) => c.id);
    const where = { conversationId: { in: convIds }, deletedAt: null };
    const [total, rows] = await Promise.all([
      this.prisma.message.count({ where }),
      this.prisma.message.findMany({
        where,
        orderBy: { sentAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { relayedAs: true },
      }),
    ]);
    const items = rows.map((m) =>
      toMessage(m.id, m.senderId, m.body, m.sentAt, m.relayedAs !== null),
    );
    return { items, page, pageSize, total };
  }

  private async listConversationMessages(
    conversationId: bigint,
    query: ListFarmsQueryDto,
    viewerId: bigint,
    staffView = false,
  ): Promise<MessageListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = { conversationId, deletedAt: null };
    const [total, rows] = await Promise.all([
      this.prisma.message.count({ where }),
      this.prisma.message.findMany({
        where,
        orderBy: { sentAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { relayedAs: true },
      }),
    ]);
    const items = rows.map((m) => {
      const hideStaffNote = !staffView && m.senderId !== viewerId && m.relayedAs === null;
      return toMessage(
        m.id,
        m.senderId,
        hideStaffNote ? m.body : m.body,
        m.sentAt,
        m.relayedAs !== null,
      );
    });
    return { items, page, pageSize, total };
  }

  private async loadOpenCase(caseId: bigint) {
    const caseRow = await this.prisma.communicationCase.findUnique({ where: { id: caseId } });
    if (!caseRow) throw notFound();
    if (caseRow.status === CommunicationCaseStatus.closed) {
      throw new ConflictException('This communication case is closed');
    }
    return caseRow;
  }

  private async ensureConversation(caseId: bigint, externalUserId: bigint) {
    const existing = await this.prisma.conversation.findFirst({
      where: { caseId, externalUserId },
    });
    if (existing) return existing;
    return this.prisma.conversation.create({
      data: { caseId, externalUserId, status: 'open' },
    });
  }
}

function forbiddenConversation(): NotFoundException {
  return new NotFoundException('Communication case not found');
}

function toMessage(
  id: bigint,
  senderId: bigint,
  body: string | null,
  sentAt: Date | null,
  isRelayedCopy: boolean,
): MessageResponseDto {
  return {
    id: id.toString(),
    senderId: senderId.toString(),
    body,
    sentAt: sentAt?.toISOString() ?? null,
    isRelayedCopy,
  };
}
