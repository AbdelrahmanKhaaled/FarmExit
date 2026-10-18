import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { StreamableFile } from '@nestjs/common';
import type { RequestDocument } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { staffHasAdminScope, StaffPermission } from '../authorization/staff-permissions';
import type { StaffContext } from '../authorization/staff.types';
import { isRequestDocumentStorageKey, RequestDocumentFilesService } from '../media/request-document-files.service';
import type { UploadedRequestDocumentFile } from '../media/request-document-upload.validator';
import { OWNER_EDITABLE_STATUSES, staffInboxRequestTypes } from './request-workflow.policy';

const notFound = (): NotFoundException => new NotFoundException('Request not found');
const docNotFound = (): NotFoundException => new NotFoundException('Document not found');

export type RequestDocumentMetadataDto = {
  id: string;
  slotKey: string;
  documentType: string | null;
  originalName: string | null;
  mimeType: string | null;
  fileSizeBytes: string | null;
  reviewStatus: string;
  reviewNote: string | null;
  createdAt: string | null;
};

@Injectable()
export class RequestDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: RequestDocumentFilesService,
    private readonly staffAuth: StaffAuthorizationService,
  ) {}

  async upload(
    userId: bigint,
    requestId: bigint,
    slotKey: string,
    file: UploadedRequestDocumentFile,
    documentType?: string | null,
  ): Promise<RequestDocumentMetadataDto> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, createdBy: userId },
    });
    if (!request) throw notFound();
    if (!OWNER_EDITABLE_STATUSES.has(request.status)) {
      throw new ConflictException('Documents can only be uploaded while the request is editable');
    }

    const normalizedSlot = slotKey.trim();
    if (!normalizedSlot || normalizedSlot.length > 60) {
      throw new ConflictException('Invalid document slot');
    }

    const prepared = this.files.prepare(file);
    const storageKey = await this.files.store(requestId, prepared);
    try {
      const row = await this.prisma.requestDocument.create({
        data: {
          requestId,
          uploadedBy: userId,
          slotKey: normalizedSlot,
          documentType: documentType?.trim() || null,
          originalName: prepared.originalName,
          storageKey,
          mimeType: prepared.contentType,
          fileSizeBytes: BigInt(prepared.data.length),
          reviewStatus: 'uploaded',
        },
      });
      return toMetadata(row);
    } catch (error) {
      await this.files.discard(storageKey);
      throw error;
    }
  }

  async download(userId: bigint, requestId: bigint, documentId: bigint): Promise<StreamableFile> {
    const doc = await this.loadAuthorizedDocument(userId, requestId, documentId);
    if (!isRequestDocumentStorageKey(requestId, doc.storageKey)) throw docNotFound();
    const opened = await this.files.open(doc.storageKey);
    return new StreamableFile(opened.stream, {
      type: doc.mimeType ?? 'application/octet-stream',
      length: opened.size,
      disposition: `attachment; filename="${sanitizeFilename(doc.originalName ?? 'document')}"`,
    });
  }

  async listMetadata(userId: bigint, requestId: bigint): Promise<RequestDocumentMetadataDto[]> {
    const request = await this.prisma.request.findFirst({
      where: { id: requestId, createdBy: userId },
    });
    if (!request) throw notFound();
    const rows = await this.prisma.requestDocument.findMany({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toMetadata);
  }

  private async loadAuthorizedDocument(
    userId: bigint,
    requestId: bigint,
    documentId: bigint,
  ): Promise<RequestDocument> {
    const doc = await this.prisma.requestDocument.findUnique({ where: { id: documentId } });
    if (!doc || doc.requestId !== requestId) throw docNotFound();

    const request = await this.prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw notFound();

    if (request.createdBy === userId) return doc;
    const staff = await this.staffAuth.loadContext(userId);
    if (staff?.permissions.includes(StaffPermission.RequestsRead)) {
      await this.assertStaffRequestAccess(staff, requestId);
      return doc;
    }
    throw notFound();
  }

  private async assertStaffRequestAccess(staff: StaffContext, requestId: bigint): Promise<void> {
    if (staffHasAdminScope(staff.roles)) return;

    const assignment = await this.prisma.requestStaffAssignment.findFirst({
      where: { requestId, assignedStaffId: staff.userId },
    });
    if (assignment) return;

    const allAssignments = await this.prisma.requestStaffAssignment.findMany({
      where: { requestId },
      select: { id: true },
    });
    if (allAssignments.length === 0) {
      const request = await this.prisma.request.findUnique({
        where: { id: requestId },
        select: { requestType: true },
      });
      if (!request) throw notFound();
      const allowedTypes = staffInboxRequestTypes(staff);
      if (allowedTypes !== null && !allowedTypes.includes(request.requestType)) {
        throw notFound();
      }
      return;
    }
    throw notFound();
  }
}

function toMetadata(row: RequestDocument): RequestDocumentMetadataDto {
  return {
    id: row.id.toString(),
    slotKey: row.slotKey,
    documentType: row.documentType,
    originalName: row.originalName,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes ? row.fileSizeBytes.toString() : null,
    reviewStatus: row.reviewStatus,
    reviewNote: row.reviewNote,
    createdAt: row.createdAt?.toISOString() ?? null,
  };
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\-() ]+/g, '_').slice(0, 200);
}
