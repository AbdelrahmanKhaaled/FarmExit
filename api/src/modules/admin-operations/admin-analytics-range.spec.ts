import { BadRequestException } from '@nestjs/common';
import { bucketKeys, dayKey, fillSeries, monthKey, resolveAnalyticsRange, weekKey } from './admin-analytics-range';

describe('admin-analytics-range', () => {
  it('aligns weekly buckets to SQL Mondays including partial boundary weeks', () => {
    const ctx = resolveAnalyticsRange({ range: '90d', to: '2026-10-27' });
    const keys = bucketKeys(ctx.from, ctx.toExclusive, ctx.granularity);
    expect(keys[0]).toBe(weekKey(ctx.from));
    expect(keys.at(-1)).toBe('2026-10-26');
    expect(fillSeries(keys, [{ date: '2026-10-26', count: 5 }]).reduce((sum, p) => sum + p.count, 0)).toBe(5);
  });

  it('does not skip February or the final month when starting on the 31st', () => {
    expect(bucketKeys(new Date('2026-01-31Z'), new Date('2026-04-02Z'), 'month')).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
    ]);
  });

  it.each(['7d', '30d', '90d', '12m', 'all'] as const)('preserves all records and totals for %s', (range) => {
    const ctx = resolveAnalyticsRange({ range, to: '2026-10-27' }, new Date('2019-12-31Z'));
    const dates = [ctx.from, new Date('2026-10-26T23:59:59.999Z'), ctx.toInclusive];
    const key = ctx.granularity === 'month' ? monthKey : ctx.granularity === 'week' ? weekKey : dayKey;
    const grouped = new Map<string, number>();
    for (const date of dates) grouped.set(key(date), (grouped.get(key(date)) ?? 0) + 1);
    const series = fillSeries(
      bucketKeys(ctx.from, ctx.toExclusive, ctx.granularity),
      [...grouped].map(([date, count]) => ({ date, count })),
    );
    expect(series.reduce((sum, p) => sum + p.count, 0)).toBe(dates.length);
  });

  it('uses custom dates rather than a leftover preset to select granularity', () => {
    const ctx = resolveAnalyticsRange({ range: 'all', from: '2026-10-27', to: '2026-10-27' });
    expect(ctx.granularity).toBe('day');
    expect(ctx.toExclusive.toISOString()).toBe('2026-10-28T00:00:00.000Z');
    expect(bucketKeys(ctx.from, ctx.toExclusive, ctx.granularity)).toEqual(['2026-10-27']);
  });
  it('rejects inverted custom ranges', () => {
    expect(() => resolveAnalyticsRange({ from: '2026-10-10T00:00:00.000Z', to: '2026-10-01T00:00:00.000Z' })).toThrow(
      BadRequestException,
    );
  });

  it('fills missing buckets with zero', () => {
    const keys = ['2026-10-01', '2026-10-02', '2026-10-03'];
    const filled = fillSeries(keys, [{ date: '2026-10-02', count: 4 }]);
    expect(filled).toEqual([
      { date: '2026-10-01', count: 0 },
      { date: '2026-10-02', count: 4 },
      { date: '2026-10-03', count: 0 },
    ]);
  });

  it('builds daily buckets for 7d preset', () => {
    const { from, toExclusive, granularity } = resolveAnalyticsRange({
      range: '7d',
      to: '2026-10-07T12:00:00.000Z',
    });
    expect(granularity).toBe('day');
    const keys = bucketKeys(from, toExclusive, granularity);
    expect(keys.length).toBe(7);
  });
});
