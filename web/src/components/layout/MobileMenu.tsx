'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { BlockButtonLink } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Sheet } from '@/components/overlay/Sheet';
import { accountLinks, primaryNav } from './site-links';

/*
 * Tablet and mobile navigation: the Navbar's Menu icon button opens an end-side Sheet with the links collapsed
 * from the desktop bar, the language toggle and the account actions ("List your farm moves into the menu" on
 * mobile). The open menu panel has no dedicated Figma frame; it is composed only from approved components
 * (Sheet, Label/Nav links, Language Toggle, Button / Block).
 */
export function MobileMenu({
  signedIn,
  className,
  sessionPending = false,
}: {
  signedIn: boolean;
  className?: string;
  sessionPending?: boolean;
}) {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className={className}>
      <IconButton
        variant="menu"
        icon="menu"
        label={t('menu.open')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      />
      <Sheet open={open} onOpenChange={setOpen} side="end" title={t('menu.title')}>
        <nav aria-label={t('primaryLabel')}>
          <ul className="flex flex-col">
            {primaryNav.map((item) => (
              <li key={item.key} className="border-b border-border-subtle">
                <Link
                  href={item.href}
                  prefetch={item.key === 'farms' ? false : undefined}
                  onClick={close}
                  className="flex min-h-52 items-center type-label-nav text-text-primary hover:text-text-brand"
                >
                  {t(`links.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-24 flex flex-col gap-12">
          {!signedIn && !sessionPending && (
            <BlockButtonLink href={accountLinks.signIn} variant="outline" onClick={close}>
              {t('signIn')}
            </BlockButtonLink>
          )}
          <BlockButtonLink href={accountLinks.listYourFarm} variant="primary" onClick={close}>
            {t('listYourFarm')}
          </BlockButtonLink>
          <LanguageToggle className="self-start" />
        </div>
      </Sheet>
    </div>
  );
}
