import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthSessionAudience } from '../../generated/prisma/enums';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { WebsiteAudienceGuard } from '../admin-auth/website-audience.guard';
import { RequireCompletedProfile } from '../auth/auth-guards.decorators';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { RateLimit, RateLimitGuard } from '../auth/rate-limit';
import { ListFarmsQueryDto } from '../farms/dto/list-farms-query.dto';
import { CommunicationCasesService } from './communication-cases.service';
import { CommunicationMessagesService } from './communication-messages.service';
import { CommunicationRealtimeTicketService } from './communication-realtime-ticket.service';
import { RealtimeTicketResponseDto } from './dto/realtime-ticket.dto';
import {
  CommunicationCaseListResponseDto,
  CommunicationCaseResponseDto,
  MessageListResponseDto,
  MessageResponseDto,
  OpenCommunicationCaseDto,
  SendMessageDto,
} from './dto/communication.dto';

@ApiTags('communication')
@Controller('communication')
@RequireCompletedProfile()
export class CommunicationController {
  constructor(
    private readonly cases: CommunicationCasesService,
    private readonly messages: CommunicationMessagesService,
    private readonly realtimeTickets: CommunicationRealtimeTicketService,
  ) {}

  @Post('cases')
  @ApiCreatedResponse({ type: CommunicationCaseResponseDto })
  open(@CurrentAuth() auth: AuthContext, @Body() dto: OpenCommunicationCaseDto): Promise<CommunicationCaseResponseDto> {
    return this.cases.open(auth.userId, dto);
  }

  @Get('cases')
  @ApiOkResponse({ type: CommunicationCaseListResponseDto })
  listCases(
    @CurrentAuth() auth: AuthContext,
    @Query() query: ListFarmsQueryDto,
  ): Promise<CommunicationCaseListResponseDto> {
    return this.cases.listMine(auth.userId, query);
  }

  @Get('cases/:id')
  @ApiOkResponse({ type: CommunicationCaseResponseDto })
  getCase(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
  ): Promise<CommunicationCaseResponseDto> {
    return this.cases.getMine(auth.userId, id);
  }

  @Post('cases/:id/messages')
  @ApiCreatedResponse({ type: MessageResponseDto })
  sendMessage(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messages.sendUser(auth.userId, id, dto);
  }

  @Post('realtime-ticket')
  @UseGuards(WebsiteAudienceGuard, RateLimitGuard)
  @RateLimit({ limit: 30, windowSeconds: 60 })
  @ApiCreatedResponse({ type: RealtimeTicketResponseDto })
  mintRealtimeTicket(@CurrentAuth() auth: AuthContext): RealtimeTicketResponseDto {
    return this.realtimeTickets.mint(auth.userId, auth.sessionId, AuthSessionAudience.website);
  }

  @Get('cases/:id/messages')
  @ApiOkResponse({ type: MessageListResponseDto })
  listMessages(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Query() query: ListFarmsQueryDto,
  ): Promise<MessageListResponseDto> {
    return this.messages.listUser(auth.userId, id, query);
  }
}
