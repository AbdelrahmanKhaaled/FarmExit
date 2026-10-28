export type AnalyticsRangePreset = '7d' | '30d' | '90d' | '12m' | 'all';

export function buildAnalyticsQueryString(params: {
  range?: AnalyticsRangePreset;
  from?: string;
  to?: string;
}): string {
  const qs = new URLSearchParams();
  if (params.from && params.to) {
    qs.set('from', params.from);
    qs.set('to', params.to);
  } else if (params.range) {
    qs.set('range', params.range);
  } else {
    qs.set('range', '30d');
  }
  return qs.toString();
}
