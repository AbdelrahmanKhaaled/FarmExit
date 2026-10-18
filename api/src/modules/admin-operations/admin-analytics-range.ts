import { BadRequestException } from '@nestjs/common';
import type { AdminAnalyticsQueryDto } from './dto/admin-analytics.dto';

export type AnalyticsGranularity = 'day' | 'week' | 'month';

export type ResolvedAnalyticsRange = {
  from: Date;
  /** Inclusive end instant for display (last moment inside range). */
  toInclusive: Date;
  /** Exclusive upper bound for SQL filters (`< toExclusive`). */
  toExclusive: Date;
  granularity: AnalyticsGranularity;
};

const MS_DAY = 24 * 60 * 60 * 1000;
const MAX_CUSTOM_DAYS = 730;

export function resolveAnalyticsRange(query: AdminAnalyticsQueryDto): ResolvedAnalyticsRange {
  const now = new Date();
  let toInclusive = query.to ? endOfUtcDay(new Date(query.to)) : now;
  let from: Date;

  if (query.from) {
    from = startOfUtcDay(new Date(query.from));
    if (Number.isNaN(from.getTime()) || Number.isNaN(toInclusive.getTime())) {
      throw new BadRequestException('Invalid from or to date');
    }
    if (from >= toInclusive) {
      throw new BadRequestException('from must be before to');
    }
    const spanDays = Math.ceil((toInclusive.getTime() - from.getTime()) / MS_DAY);
    if (spanDays > MAX_CUSTOM_DAYS) {
      throw new BadRequestException(`Custom range cannot exceed ${MAX_CUSTOM_DAYS} days`);
    }
  } else {
    from = new Date(toInclusive);
    switch (query.range ?? '30d') {
      case '7d':
        from.setUTCDate(from.getUTCDate() - 6);
        break;
      case '90d':
        from.setUTCDate(from.getUTCDate() - 89);
        break;
      case '12m':
        from.setUTCFullYear(from.getUTCFullYear() - 1);
        from.setUTCDate(from.getUTCDate() + 1);
        break;
      case 'all':
        from = startOfUtcDay(new Date('2020-01-01T00:00:00.000Z'));
        break;
      default:
        from.setUTCDate(from.getUTCDate() - 29);
    }
    from = startOfUtcDay(from);
  }

  const toExclusive = new Date(toInclusive.getTime() + 1);
  const spanDays = Math.max(1, Math.ceil((toExclusive.getTime() - from.getTime()) / MS_DAY));
  const granularity = pickGranularity(query.range, spanDays);

  return { from, toInclusive, toExclusive, granularity };
}

function pickGranularity(range: AdminAnalyticsQueryDto['range'], spanDays: number): AnalyticsGranularity {
  if (range === '12m' || range === 'all' || spanDays > 120) return 'month';
  if (range === '90d' || spanDays > 45) return 'week';
  return 'day';
}

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function endOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

export function bucketKeys(from: Date, toExclusive: Date, granularity: AnalyticsGranularity): string[] {
  const keys: string[] = [];
  const cursor = startOfUtcDay(from);
  const end = toExclusive.getTime();

  while (cursor.getTime() < end) {
    if (granularity === 'month') {
      keys.push(monthKey(cursor));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    } else if (granularity === 'week') {
      keys.push(weekKey(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    } else {
      keys.push(dayKey(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  return keys;
}

export function fillSeries(
  keys: string[],
  points: { date: string; count: number }[],
): { date: string; count: number }[] {
  const map = new Map(points.map((p) => [p.date, p.count]));
  return keys.map((date) => ({ date, count: map.get(date) ?? 0 }));
}

export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function weekKey(d: Date): string {
  const start = startOfUtcDay(d);
  return dayKey(start);
}

export function sqlBucketExpr(granularity: AnalyticsGranularity, column: string): string {
  if (granularity === 'month') return `DATE_FORMAT(${column}, '%Y-%m')`;
  if (granularity === 'week') return `DATE(DATE_SUB(${column}, INTERVAL WEEKDAY(${column}) DAY))`;
  return `DATE(${column})`;
}
