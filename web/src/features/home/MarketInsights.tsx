import { useLocale, useTranslations } from 'next-intl';
import { Container } from '@/components/layout/Container';
import { SectionHeader } from '@/components/layout/Section';
import { shortEgp, formatEgp } from '@/lib/format';
import type { HomeData } from './home-data';
import { localizeGovernorate } from './home-aggregates';

const COLUMNS = ['governorate', 'sale', 'rent', 'listings'] as const;

function formatInsightPrice(amount: number | null, locale: string): string {
  if (amount === null || !Number.isFinite(amount)) {
    return locale === 'ar' ? 'غير متاح' : 'Not available';
  }
  const { value, unit } = shortEgp(amount);
  if (locale === 'ar') {
    if (unit === 'million') return `${value} مليون ج.م`;
    if (unit === 'thousand') return `${value} ألف ج.م`;
    return `${value} ج.م`;
  }
  if (unit === 'million') return `EGP ${value}M`;
  if (unit === 'thousand') return `EGP ${value}K`;
  return `EGP ${value}`;
}

export function MarketInsights({ data }: { data: HomeData | null }) {
  const t = useTranslations('home.insights');
  const locale = useLocale();
  const ar = locale === 'ar';

  return (
    <section id="market-insights" aria-labelledby="insights-title" className="scroll-mt-r-nav-height pt-r-section-gap">
      <Container className="flex flex-col gap-32">
        <SectionHeader eyebrow={t('eyebrow')} titleId="insights-title" title={t('title')} subtitle={t('subtitle')} />

        <p className="type-body-caption text-text-muted">
          {ar
            ? 'متوسط أسعار العرض لكل فدان من الإعلانات المنشورة؛ ليست أسعار صفقات مكتملة أو تقييمات سوقية.'
            : 'Average asking prices per feddan from published listings; not completed-sale prices or market valuations.'}
        </p>

        {!data ? (
          <div className="rounded-card border border-border-default bg-bg-surface p-32 text-center">
            <p role="status" className="type-body-default text-text-muted">
              {ar ? 'بيانات مؤشرات السوق غير متاحة حاليًا.' : 'Market insights data is currently unavailable.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border-default bg-bg-surface">
            <table className="w-full min-w-760 border-collapse text-start">
              <caption className="sr-only">{t('caption')}</caption>
              <colgroup>
                <col className="w-347" />
                <col className="w-236" />
                <col className="w-236" />
                <col className="w-173" />
                <col />
              </colgroup>
              <thead className="bg-bg-subtle">
                <tr>
                  {COLUMNS.map((col, i) => (
                    <th
                      key={col}
                      scope="col"
                      className={`py-18 text-start type-overline-field text-text-muted ${i === 0 ? 'ps-32' : 'ps-16'}`}
                    >
                      {t(`columns.${col}`)}
                    </th>
                  ))}
                  <td aria-hidden="true" className="pe-32" />
                </tr>
              </thead>
              <tbody>
                {data.insights.map((r) => (
                  <tr key={r.governorate} className="border-t border-border-subtle">
                    <th scope="row" className="py-20 ps-32 text-start type-numeric-large text-text-primary">
                      {localizeGovernorate(r.governorate, locale)}
                    </th>
                    <td className="ps-16 type-numeric-large text-text-brand">
                      <span
                        title={
                          r.salePerFeddan !== null
                            ? `${formatEgp(r.salePerFeddan)} ${ar ? 'ج.م' : 'EGP'}`
                            : undefined
                        }
                      >
                        {formatInsightPrice(r.salePerFeddan, locale)}
                      </span>
                    </td>
                    <td className="ps-16 type-body-table text-text-secondary">
                      <span
                        title={
                          r.rentPerFeddan !== null
                            ? `${formatEgp(r.rentPerFeddan)} ${ar ? 'ج.م' : 'EGP'}`
                            : undefined
                        }
                      >
                        {formatInsightPrice(r.rentPerFeddan, locale)}
                      </span>
                    </td>
                    <td className="ps-16 type-body-table text-text-secondary">
                      {new Intl.NumberFormat(locale).format(r.listings)}
                    </td>
                    <td aria-hidden="true" className="pe-32" />
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.insights.length && (
              <p className="p-24 type-body-caption text-text-muted">
                {ar ? 'لا توجد بيانات منشورة بعد' : 'No published data yet'}
              </p>
            )}
          </div>
        )}
      </Container>
    </section>
  );
}
