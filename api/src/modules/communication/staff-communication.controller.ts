import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthSessionAudience } from '../../generated/prisma/enums';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { StaffDashboardOnly, StaffOnly, StaffPermissions } from '../authorization/staff.decorators';
import { StaffPermission } from '../authorization/staff-permissions';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { RateLimit, RateLimitGuard } from '../auth/rate-limit';
import { CommunicationRealtimeTicketService } from './communication-realtime-ticket.service';
import { RealtimeTicketResponseDto } from './dto/realtime-ticket.dto';
import { ConversationSummaryDto } from './dto/conversation-summary.dto';
import { ListCommunicationCasesQueryDto } from './dto/list-communication-cases-query.dto';
import { ListStaffMessagesQueryDto } from './dto/list-staff-messages-query.dto';
import { CommunicationCasesService } from './communication-cases.service';
import { CommunicationMessagesService } from './communication-messages.service';
import {
  CommunicationCaseListResponseDto,
  CommunicationCaseResponseDto,
  MessageListResponseDto,
  MessageResponseDto,
  RelayMessageDto,
  SendMessageDto,
  UpdateCaseStatusDto,
} from './dto/communication.dto';

@ApiTags('staff-communication')
@Controller('staff/communication')
@StaffOnly()
@StaffPermissions(StaffPermission.CommunicationRelay)
export class StaffCommunicationController {
  constructor(
    private readonly cases: CommunicationCasesService,
    private readonly messages: CommunicationMessagesService,
    private readonly realtimeTickets: CommunicationRealtimeTicketService,
  ) {}

  @Post('realtime-ticket')
  @StaffDashboardOnly()
  @StaffPermissions(StaffPermission.CommunicationRelay)
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 30, windowSeconds: 60 })
  @ApiCreatedResponse({ type: RealtimeTicketResponseDto })
  mintRealtimeTicket(@CurrentAuth() auth: AuthContext): RealtimeTicketResponseDto {
    return this.realtimeTickets.mint(auth.userId, auth.sessionId, AuthSessionAudience.dashboard);
  }

  @Get('cases')
  @ApiOkResponse({ type: CommunicationCaseListResponseDto })
  listCases(
    @CurrentAuth() auth: AuthContext,
    @Query() query: ListCommunicationCasesQueryDto,
  ): Promise<CommunicationCaseListResponseDto> {
    return this.cases.listStaff(auth.userId, query);
  }

  @Get('cases/:id/conversations')
  @ApiOkResponse({ type: [ConversationSummaryDto] })
  listConversations(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
  ) {
    return this.cases.listConversationsStaff(auth.userId, id);
  }

  @Get('cases/:id')
  @ApiOkResponse({ type: CommunicationCaseResponseDto })
  getCase(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
  ): Promise<CommunicationCaseResponseDto> {
    return this.cases.getStaff(auth.userId, id);
  }

  @Patch('cases/:id/status')
  @ApiOkResponse({ type: CommunicationCaseResponseDto })
  updateStatus(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: UpdateCaseStatusDto,
  ): Promise<CommunicationCaseResponseDto> {
    return this.cases.updateStatusStaff(auth.userId, id, dto);
  }

  @Post('cases/:id/messages')
  @ApiCreatedResponse({ type: MessageResponseDto })
  sendToParticipant(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Query('externalUserId', ParseBigIntIdPipe) externalUserId: bigint,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messages.sendStaff(auth.userId, id, externalUserId, dto);
  }

  @Post('cases/:id/relay')
  @ApiCreatedResponse({ type: MessageResponseDto })
  relay(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: RelayMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messages.relayStaff(auth.userId, id, dto);
  }

  @Get('cases/:id/messages')
  @ApiOkResponse({ type: MessageListResponseDto })
  listMessages(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Query() query: ListStaffMessagesQueryDto,
  ): Promise<MessageListResponseDto> {
    const convId = query.conversationId ? BigInt(query.conversationId) : undefined;
    return this.messages.listStaff(auth.userId, id, query, convId);
  }
}
