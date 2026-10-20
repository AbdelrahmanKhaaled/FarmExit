import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/brand/Logo';
import { Container } from './Container';
import { footerColumns } from './site-links';

/*
 * Figma: Components → Group / CTA & Footer → Footer (Breakpoint = Desktop 1440 / Tablet 1024 / Mobile 390).
 * brand/deep band. Full logo (Dark) 80 (64 on mobile) + about (Body/Footer, 340) + three link columns
 * (Overline/Footer headings, Label/Footer Link links, gap 18 / 12), then a footer-line hairline and the
 * copyright row (Body/Caption).
 * - Desktop: 80/40 padding, About 2fr + 3 × 1fr (403 / 202 at 1200), gap 64, 64 to the bottom row
 * - Tablet: 72/40 padding, About full width (logo beside text, gap 40), 3 columns, gap 40, 48 to the bottom row
 * - Mobile: 56/32 padding, everything stacked (gap 32), 40 to the bottom row, bottom row stacked (gap 6)
 */
export function Footer({ className }: { className?: string }) {
  const t = useTranslations('nav.footer');

  return (
    <footer aria-label={t('label')} className={cn('bg-brand-deep text-text-on-dark', className)}>
      <Container className="flex flex-col gap-40 pt-56 pb-32 tablet:gap-48 tablet:pt-72 tablet:pb-40 desktop:gap-64 desktop:pt-80">
        <div className="grid grid-cols-1 gap-32 tablet:grid-cols-3 tablet:gap-40 desktop:grid-cols-[2fr_1fr_1fr_1fr] desktop:gap-64">
          <div className="flex flex-col items-start gap-16 tablet:col-span-3 tablet:flex-row tablet:items-center tablet:gap-40 desktop:col-span-1 desktop:flex-col desktop:items-start desktop:gap-16">
            <Logo variant="full" tone="dark" className="h-64 w-auto tablet:h-80" />
            <p className="type-body-footer text-overlay-on-dark-muted tablet:max-w-340">{t('about')}</p>
          </div>

          {footerColumns.map((column) => (
            <nav key={column.key} aria-labelledby={`footer-${column.key}`} className="flex flex-col gap-18">
              <h2 id={`footer-${column.key}`} className="type-overline-footer text-text-on-dark">
                {t(`columns.${column.key}`)}
              </h2>
              <ul className="flex flex-col gap-12">
                {column.links.map((link) => (
                  <li key={link.key}>
                    <Link
                      href={link.href}
                      prefetch={column.key === 'farms' ? false : undefined}
                      className="type-label-footer-link text-overlay-on-dark-muted transition-colors duration-150 hover:text-text-on-dark"
                    >
                      {t(`links.${link.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-6 border-t border-overlay-footer-line pt-24 type-body-caption text-overlay-on-dark-muted tablet:flex-row tablet:justify-between">
          <p>{t('copyright')}</p>
          <p>{t('location')}</p>
        </div>
      </Container>
    </footer>
  );
}
