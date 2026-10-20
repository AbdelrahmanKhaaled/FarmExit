import { useTranslations } from 'next-intl';
import { Container } from '@/components/layout/Container';
import { SectionHeader } from '@/components/layout/Section';
import { insightRows } from './data';

/*
 * Figma: Homepage › Section / Market Insights — Section Header + Insights Table (Components → Group / Content Rows,
 * Header + Row). White, border/default, r24. Header bg/subtle, Overline/Field; rows 61 tall with border/subtle rules:
 * governorate Numeric/Large (primary), sale Numeric/Large (brand), rent and listings Body/Table (secondary).
 * Columns 315 · 220 · 220 · 157 at 1198 (the score column was removed, Source of Truth 4p). The table scrolls inside
 * its card below desktop (min 760). Sample averages.
 */
const COLUMNS = ['governorate', 'sale', 'rent', 'listings'] as const;

export function MarketInsights() {
  const t = useTranslations('home.insights');
  const ts = useTranslations('home');

  return (
    <section id="market-insights" aria-labelledby="insights-title" className="scroll-mt-r-nav-height pt-r-section-gap">
      <Container className="flex flex-col gap-48">
        <SectionHeader eyebrow={t('eyebrow')} titleId="insights-title" title={t('title')} subtitle={t('subtitle')} />
        <p className="type-body-caption text-text-muted">{ts('sampleContentNote')}</p>
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
              {insightRows.map((row) => (
                <tr key={row} className="border-t border-border-subtle">
                  <th scope="row" className="py-20 ps-32 text-start type-numeric-large text-text-primary">
                    {t(`rows.${row}.name`)}
                  </th>
                  <td className="ps-16 type-numeric-large text-text-brand">{t(`rows.${row}.sale`)}</td>
                  <td className="ps-16 type-body-table text-text-secondary">{t(`rows.${row}.rent`)}</td>
                  <td className="ps-16 type-body-table text-text-secondary">{t(`rows.${row}.listings`)}</td>
                  <td aria-hidden="true" className="pe-32" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </section>
  );
}
