import { BadRequestException } from '@nestjs/common';
import { bucketKeys, fillSeries, resolveAnalyticsRange } from './admin-analytics-range';

describe('admin-analytics-range', () => {
  it('rejects inverted custom ranges', () => {
    expect(() =>
      resolveAnalyticsRange({ from: '2026-10-10T00:00:00.000Z', to: '2026-10-01T00:00:00.000Z' }),
    ).toThrow(BadRequestException);
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
