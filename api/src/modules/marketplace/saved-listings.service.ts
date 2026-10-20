import { Injectable, NotFoundException } from '@nestjs/common';
import { RequestType, RequestVisibility, SavedItemType } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { LISTING_PUBLISHED } from '../listing-requests/listing-requests.service';
import type { PublicListingDto } from './dto/public-listing.dto';
import { publicListingSelect, toPublicListing, type PublicListingSource } from './marketplace-query';
import { loadPublishedFarmExitScores } from './public-farm-score';

const missing = (): NotFoundException => new NotFoundException('Listing not found');

/**
 * Bookmarks of published listings. A sale and a rent on the same farm are separate rows.
 * Farm and opportunity bookmarks are untouched. An unpublished listing is omitted, not described.
 */
@Injectable()
export class SavedListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: bigint): Promise<{ items: PublicListingDto[] }> {
    const saved = await this.prisma.savedItem.findMany({
      where: { userId, itemType: SavedItemType.listing, listingRequestId: { not: null } },
      orderBy: [{ savedAt: 'desc' }, { id: 'desc' }],
      select: { listingRequestId: true },
    });
    const ids = saved.flatMap((row) => (row.listingRequestId === null ? [] : [row.listingRequestId]));
    if (ids.length === 0) return { items: [] };
    const rows = await this.prisma.request.findMany({
      where: {
        id: { in: ids },
        requestType: RequestType.farmListing,
        status: LISTING_PUBLISHED,
        visibility: RequestVisibility.public,
        farm: { is: { deletedAt: null } },
      },
      select: publicListingSelect,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const ordered = ids.flatMap((id) => {
      const row = byId.get(id);
      return row ? [row] : [];
    });
    return { items: await this.publicItems(ordered) };
  }

  async save(userId: bigint, listingId: bigint): Promise<PublicListingDto> {
    const listing = await this.publicListing(listingId);
    if (!listing) throw missing();
    try {
      await this.prisma.savedItem.create({
        data: {
          userId,
          itemType: SavedItemType.listing,
          targetKey: `listing:${listingId.toString()}`,
          listingRequestId: listingId,
        },
      });
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const existing = await this.prisma.savedItem.findFirst({
        where: { userId, itemType: SavedItemType.listing, listingRequestId: listingId },
        select: { id: true },
      });
      if (!existing) throw error;
    }
    return listing;
  }

  async remove(userId: bigint, listingId: bigint): Promise<void> {
    const removed = await this.prisma.savedItem.deleteMany({
      where: { userId, itemType: SavedItemType.listing, listingRequestId: listingId },
    });
    if (removed.count === 0) throw new NotFoundException('Saved listing not found');
  }

  private async publicListing(listingId: bigint): Promise<PublicListingDto | null> {
    const request = await this.prisma.request.findFirst({
      where: {
        id: listingId,
        requestType: RequestType.farmListing,
        status: LISTING_PUBLISHED,
        visibility: RequestVisibility.public,
        farm: { is: { deletedAt: null } },
      },
      select: publicListingSelect,
    });
    const items = request ? await this.publicItems([request]) : [];
    return items[0] ?? null;
  }

  private async publicItems(rows: PublicListingSource[]) {
    const farmIds = rows.flatMap((row) => (row.farm ? [row.farm.id] : []));
    const scores = await loadPublishedFarmExitScores(this.prisma, farmIds);
    return rows.flatMap((row) => {
      const farmId = row.farm?.id.toString();
      const score = farmId ? (scores.get(farmId) ?? null) : null;
      const item = toPublicListing(row, score);
      return item ? [item] : [];
    });
  }
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
