'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/brand/Logo';
import { Icon } from '@/components/icons/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { ButtonLink } from '@/components/ui/Button';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Container } from './Container';
import { MobileMenu } from './MobileMenu';
import { accountLinks, primaryNav } from './site-links';
import { useNavbarSession } from './use-navbar-session';

/*
 * Figma: Components → Group / Navigation & Layout → Navbar (Breakpoint × Session).
 * Sticky; white 96% (overlay/nav) with Blur/Nav Glass and a border/nav hairline; height layout/nav-height (78 · 72 · 64).
 * - Desktop 1440: Horizontal Logo 48 · 5 links (gap 22) · Language · Sign in (Ghost S) · List your farm (Primary S)
 * - Tablet 1024: Horizontal Logo 40 · links collapse into the menu button · keeps List your farm
 * - Mobile 390: Icon-only logo 36 · menu button · List your farm moves into the menu
 * Signed in: notifications bell (gold unread dot) and an account chip replace Sign in. The action order follows
 * each Figma variant: tablet keeps List your farm before the account items, desktop puts it last.
 */
export type NavbarUser = {
  firstName: string;
  initials: string;
  hasUnread?: boolean;
};

export function Navbar({
  user: initialUser,
  sessionResolved = false,
  className,
}: {
  user?: NavbarUser;
  /** Server already checked cookies and found no session (skip guest loading flash). */
  sessionResolved?: boolean;
  className?: string;
}) {
  const t = useTranslations('nav');
  const { user, pending: sessionPending } = useNavbarSession(initialUser, sessionResolved);

  return (
    <header className={cn('sticky top-0 z-40 border-b border-border-nav bg-overlay-nav effect-nav-glass', className)}>
      <Container className="flex h-r-nav-height items-center justify-between gap-32">
        <Link href="/" aria-label={t('homeLabel')} className="shrink-0 rounded-sm">
          <span className="hidden tablet:block">
            <Logo variant="horizontal" priority className="h-40 w-auto desktop:h-48" />
          </span>
          <span className="block tablet:hidden">
            <Logo variant="icon" height={36} priority />
          </span>
        </Link>

        <nav aria-label={t('primaryLabel')} className="hidden desktop:block">
          <ul className="flex items-center gap-22">
            {primaryNav.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  prefetch={item.key === 'farms' ? false : undefined}
                  className="whitespace-nowrap type-label-nav text-text-primary transition-colors duration-150 hover:text-text-brand"
                >
                  {t(`links.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-8 tablet:gap-10">
          <div className="hidden tablet:flex">
            <LanguageToggle />
          </div>

          {user ? (
            <>
              <Link
                href={accountLinks.notifications}
                aria-label={t('account.notifications')}
                className="relative inline-flex size-44 shrink-0 tablet:order-2 desktop:order-1 items-center justify-center rounded-full bg-bg-muted text-text-primary transition-colors duration-150 hover:bg-bg-hover"
              >
                <Icon name="notification" size={20} />
                {user.hasUnread && (
                  <span className="absolute end-11 top-10 size-8 rounded-full bg-brand-gold">
                    <span className="sr-only">{t('account.unread')}</span>
                  </span>
                )}
              </Link>
              <Link
                href={accountLinks.myFarmExit}
                aria-label={t('account.myFarmExit')}
                className="hidden h-42 items-center gap-8 rounded-full tablet:order-3 desktop:order-2 border border-border-hairline bg-bg-surface p-4 transition-colors duration-150 hover:border-border-strong tablet:inline-flex desktop:pe-12"
              >
                <Avatar initials={user.initials} />
                <span className="hidden type-label-small-strong text-text-primary desktop:inline">
                  {user.firstName}
                </span>
                <Icon name="chevron-down" size={16} className="hidden text-text-primary desktop:block" />
              </Link>
            </>
          ) : sessionPending ? (
            <span aria-busy="true" className="hidden h-42 w-96 desktop:block" />
          ) : (
            <div className="hidden desktop:flex">
              <ButtonLink href={accountLinks.signIn} variant="ghost" size="sm">
                {t('signIn')}
              </ButtonLink>
            </div>
          )}

          <div className="hidden tablet:order-1 tablet:flex desktop:order-3">
            <ButtonLink href={accountLinks.listYourFarm} variant="primary" size="sm">
              {t('listYourFarm')}
            </ButtonLink>
          </div>

          <MobileMenu
            signedIn={Boolean(user)}
            sessionPending={sessionPending}
            className="order-last flex desktop:hidden"
          />
        </div>
      </Container>
    </header>
  );
}
