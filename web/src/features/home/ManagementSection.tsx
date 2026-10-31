import { optionLabel } from '@/features/opportunity-marketplace/option-labels';
import type { HomeData } from './home-data';
import { useLocale } from 'next-intl';
import { localizeOpportunity } from '@/lib/opportunities/public-opportunity';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons/Icon';
import { BlockButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Surface';
import { Container } from '@/components/layout/Container';
import { SectionHeader } from '@/components/layout/Section';
import { RequestCard } from '@/features/management/RequestCard';
import { homeImages, homeLinks } from './data';

/*
 * Figma: Homepage › Section / Management Marketplace — white band with border/nav rules, band padding 128 · 96 · 72.
 * Photo (r24) + two Role Cards (Components → Group / Marketplace Cards → Role Card, Tone Light on bg/page · Dark on
 * brand/primary): Overline/Card audience, Heading/H4, Label/Chip list label, 6px dot list (Label/List), Button / Block M.
 * Then "Open management requests" (Heading/H3) with an "All requests" link and three Request Cards.
 * Desktop 3-up; tablet: photo across the top, the two role cards and the request cards 2-up; mobile stacked.
 */
const ROLE_ITEMS = ['one', 'two', 'three', 'four'] as const;

function RoleCard({ role, href }: { role: 'owners' | 'managers'; href: string }) {
  const t = useTranslations(`home.management.${role}`);
  const dark = role === 'managers';
  return (
    <Card
      as="article"
      tone={dark ? 'dark' : 'light'}
      surface="page"
      padding="none"
      className="flex flex-col gap-20 p-24 tablet:p-32"
    >
      <p className={cn('type-overline-card', dark ? 'text-brand-accent-soft' : 'text-text-accent')}>{t('audience')}</p>
      <h3 className={cn('type-heading-h4', dark ? 'text-text-on-dark' : 'text-text-primary')}>{t('title')}</h3>
      <div className="flex flex-col gap-12">
        <p className={cn('type-label-chip', dark ? 'text-overlay-on-dark-muted' : 'text-text-muted')}>
          {t('listLabel')}
        </p>
        <ul className="flex flex-col gap-10">
          {ROLE_ITEMS.map((key) => (
            <li
              key={key}
              className={cn(
                'flex items-center gap-10 type-label-list',
                dark ? 'text-text-on-dark' : 'text-text-primary',
              )}
            >
              <span
                aria-hidden="true"
                className={cn('size-6 shrink-0 rounded-full', dark ? 'bg-brand-accent-soft' : 'bg-brand-accent')}
              />
              {t(`items.${key}`)}
            </li>
          ))}
        </ul>
      </div>
      <BlockButtonLink href={href} variant={dark ? 'inverse' : 'primary'} size="md" className="mt-auto">
        {t('cta')}
      </BlockButtonLink>
    </Card>
  );
}

export function ManagementSection({ data }: { data: HomeData | null }) {
  const t = useTranslations('home.management');
  const locale = useLocale();
  const notStated = locale === 'ar' ? 'غير مذكور' : 'Not stated';

  return (
    <section aria-labelledby="management-title" className="border-y border-border-nav bg-bg-surface py-r-band-padding">
      <Container className="flex flex-col">
        <SectionHeader eyebrow={t('eyebrow')} titleId="management-title" title={t('title')} subtitle={t('subtitle')} />

        <div className="mt-48 grid grid-cols-1 gap-16 tablet:grid-cols-2 tablet:gap-24 desktop:grid-cols-3">
          <div className="relative h-280 overflow-hidden rounded-card tablet:col-span-2 tablet:h-320 desktop:col-span-1 desktop:h-auto desktop:min-h-420">
            <Image
              src={homeImages.managementRoles.src}
              alt={t('imageAlt')}
              fill
              sizes="(min-width: 1280px) 384px, 100vw"
              className="object-cover"
            />
          </div>
          <RoleCard role="owners" href={homeLinks.managementRequest} />
          <RoleCard role="managers" href={homeLinks.management} />
        </div>

        <div className="mt-72 flex items-center justify-between gap-16">
          <h3 className="type-heading-h3 text-text-primary">{t('requests.title')}</h3>
          <Link
            href={homeLinks.management}
            className="flex shrink-0 items-center gap-8 type-label-medium text-text-brand transition-colors duration-150 hover:text-brand-primary-hover"
          >
            {t('requests.all')}
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>

        {!data && <p role="status">{locale === 'ar' ? 'تعذر تحميل الفرص' : 'Opportunities unavailable'}</p>}
        {data && data.management.length === 0 && (
          <p role="status" className="mt-24 type-body-caption text-text-muted">
            {locale === 'ar' ? 'لا توجد طلبات إدارة منشورة حاليًا' : 'No published management requests at this time'}
          </p>
        )}
        <ul className="mt-24 grid grid-cols-1 gap-16 tablet:grid-cols-2 tablet:gap-24 desktop:grid-cols-3">
          {data?.management.slice(0, 3).map((raw) => {
            const item = localizeOpportunity(raw, locale);
            return (
              <li key={item.id}>
                <RequestCard
                  request={{
                    title: item.farmName,
                    location: [item.governorate, item.areaName].filter(Boolean).join(' · '),
                    specs: {
                      area:
                        new Intl.NumberFormat(locale).format(item.areaFeddan) +
                        (locale === 'ar' ? ' فدان' : ' feddans'),
                      activity: item.mainActivity || notStated,
                      term: item.term || notStated,
                    },
                    scope: item.managementTypes?.map((v) => optionLabel(v, locale)).join(' · ') || notStated,
                    services: [],
                    requirements: item.currentSituation || notStated,
                    applicants: '',
                    ctaLabel: locale === 'ar' ? 'عرض الفرصة' : 'View opportunity',
                    href: `${homeLinks.management}?id=${item.id}`,
                  }}
                />
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
