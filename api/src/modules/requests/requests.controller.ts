import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ParseBigIntIdPipe } from '../../common/pipes/parse-bigint-id.pipe';
import { RequireCompletedProfile } from '../auth/auth-guards.decorators';
import { CurrentAuth } from '../auth/auth.decorators';
import type { AuthContext } from '../auth/auth.types';
import { ForwardingDecisionDto } from './dto/forwarding-decision.dto';
import { ListRequestsQueryDto } from './dto/list-requests-query.dto';
import {
  RequestListResponseDto,
  RequestResponseDto,
} from './dto/request-response.dto';
import { WithdrawRequestDto } from './dto/withdraw-request.dto';
import { UploadRequestDocumentBodyDto, UploadRequestDocumentDto } from './dto/upload-request-document.dto';
import type { RequestDocumentMetadataDto } from './request-documents.service';
import { RequestDocumentsService } from './request-documents.service';
import type { UploadedImageFile } from '../media/image-upload.validator';
import { RequestsService } from './requests.service';

const UPLOAD = FileInterceptor('file', {
  limits: { fileSize: 10_485_760, files: 1, fields: 8, fieldSize: 2048, parts: 10, headerPairs: 50 },
});

@ApiTags('requests')
@Controller('requests')
@RequireCompletedProfile()
export class RequestsController {
  constructor(
    private readonly requests: RequestsService,
    private readonly requestDocuments: RequestDocumentsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'View own requests',
    description: 'Returns a paginated list of all requests created by the authenticated caller across all types.',
  })
  @ApiOkResponse({ type: RequestListResponseDto })
  listMine(
    @CurrentAuth() auth: AuthContext,
    @Query() query: ListRequestsQueryDto,
  ): Promise<RequestListResponseDto> {
    return this.requests.listMine(auth.userId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'View own request details',
    description: 'Returns full details, permitted status history, review feedback, and attached documents for a request owned by the caller.',
  })
  @ApiParam({ name: 'id', example: '1', description: 'Request ID' })
  @ApiOkResponse({ type: RequestResponseDto })
  @ApiNotFoundResponse({ description: 'Request not found or not owned by caller' })
  getMine(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
  ): Promise<RequestResponseDto> {
    return this.requests.getMine(auth.userId, id);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit a draft request for FarmExit review',
    description: 'Transitions a draft request into review status. Drafts cannot be reviewed or forwarded until submitted.',
  })
  @ApiParam({ name: 'id', example: '1', description: 'Request ID' })
  @ApiOkResponse({ type: RequestResponseDto })
  @ApiConflictResponse({ description: 'Only draft requests can be submitted' })
  @ApiNotFoundResponse({ description: 'Request not found' })
  submitDraft(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
  ): Promise<RequestResponseDto> {
    return this.requests.submitDraft(auth.userId, id);
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Withdraw an active request',
    description: 'Allows a requester to withdraw a pending, draft, or under-review request when permitted by the workflow.',
  })
  @ApiParam({ name: 'id', example: '1', description: 'Request ID' })
  @ApiOkResponse({ type: RequestResponseDto })
  @ApiConflictResponse({ description: 'Requests in final or approved status cannot be withdrawn' })
  @ApiNotFoundResponse({ description: 'Request not found' })
  withdraw(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: WithdrawRequestDto,
  ): Promise<RequestResponseDto> {
    return this.requests.withdraw(auth.userId, id, dto);
  }

  @Post(':id/forwardings/:forwardingId/decision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Owner decision on a forwarded request',
    description: 'Allows the recipient party (e.g. farm owner) to record an acceptance or decline on a mediated forwarded request.',
  })
  @ApiParam({ name: 'id', example: '1', description: 'Request ID' })
  @ApiParam({ name: 'forwardingId', example: '1', description: 'Forwarding record ID' })
  @ApiOkResponse({ type: RequestResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid decision payload' })
  @ApiForbiddenResponse({ description: 'Caller is not the recipient of this forwarding record' })
  @ApiNotFoundResponse({ description: 'Request or forwarding record not found' })
  recordOwnerDecision(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Param('forwardingId', ParseBigIntIdPipe) forwardingId: bigint,
    @Body() dto: ForwardingDecisionDto,
  ): Promise<RequestResponseDto> {
    return this.requests.recordForwardingDecision(auth.userId, id, forwardingId, dto);
  }

  @Post(':id/documents')
  @UseInterceptors(UPLOAD)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadRequestDocumentBodyDto })
  @ApiOperation({ summary: 'Upload a private supporting document for an owned request' })
  @ApiCreatedResponse({ description: 'Document metadata' })
  uploadDocument(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Body() dto: UploadRequestDocumentDto,
    @UploadedFile() file: UploadedImageFile,
  ): Promise<RequestDocumentMetadataDto> {
    return this.requestDocuments.upload(auth.userId, id, dto.slotKey, {
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size,
    }, dto.documentType);
  }

  @Get(':id/documents/:documentId/download')
  @ApiOperation({ summary: 'Download an owned request document (or staff with access)' })
  downloadDocument(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseBigIntIdPipe) id: bigint,
    @Param('documentId', ParseBigIntIdPipe) documentId: bigint,
  ): Promise<StreamableFile> {
    return this.requestDocuments.download(auth.userId, id, documentId);
  }
}
