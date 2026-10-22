'use client';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/icons/Icon';
import { PORTAL_PHASE, isPortalNavActive, mobileBottomNav, portalNav } from './portal-nav';

const icons: Record<string, IconName> = {
  overview: 'layer',
  farms: 'tree',
  requests: 'clipboard-tick',
  applications: 'document-text',
  saved: 'bookmark',
  messages: 'messages',
  documents: 'folder',
  notifications: 'notification',
  profile: 'user',
};

export function PortalNavigation({ bottom = false }: { bottom?: boolean }) {
  const t = useTranslations('workspace');
  const pathname = usePathname();
  const items = bottom ? mobileBottomNav : portalNav;
  return (
    <nav
      aria-label={t('nav.label')}
      data-mobile-nav={bottom ? true : undefined}
      className={
        bottom
          ? 'fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border-nav bg-bg-surface px-8 pt-8 pb-[max(12px,env(safe-area-inset-bottom))] tablet:hidden'
          : 'flex flex-col gap-4 tablet:max-desktop:flex-row tablet:max-desktop:overflow-x-auto'
      }
    >
      {items.map((item) => {
        const active = isPortalNavActive(pathname, item.href, item.key);
        const disabled = item.phase > PORTAL_PHASE;
        const label =
          bottom && item.key === 'requests'
            ? t('nav.requests')
            : bottom && item.key === 'profile'
              ? t('nav.profile')
              : t(`nav.${item.key}`);
        return (
          <Link
            key={item.key}
            href={disabled ? '/my' : item.href}
            aria-current={active ? 'page' : undefined}
            aria-disabled={disabled}
            className={cn(
              bottom
                ? 'flex min-h-56 min-w-0 flex-col items-center justify-center gap-4 rounded-lg px-2 text-center type-label-caption'
                : 'flex min-h-44 items-center gap-12 rounded-lg px-14 py-10 type-label-nav tablet:max-desktop:shrink-0',
              active ? 'bg-bg-success-soft text-text-brand' : 'text-text-secondary hover:bg-bg-hover',
              disabled && 'pointer-events-none opacity-50',
            )}
          >
            <Icon name={icons[item.key] ?? 'category'} size={bottom ? 22 : 20} className="shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
