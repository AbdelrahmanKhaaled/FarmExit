'use client';

import { Suspense } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

/*
 * Figma: Components → Group / Buttons → Language Toggle (Default · Hover). 42 tall, r12, border/strong,
 * hover border brand/primary. Shows the other language: "العربية" in English, "English" in Arabic.
 * Keeps the current path; next-intl stores the choice in its locale cookie.
 */
function ToggleLink({ href, className }: { href: string; className?: string }) {
  const t = useTranslations('common.language');
  const target = useLocale() === 'ar' ? 'en' : 'ar';
  return (
    <Link
      href={href}
      locale={target}
      hrefLang={target}
      aria-label={t('switchLabel')}
      className={cn(
        'inline-flex h-42 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-bg-surface px-14',
        'text-text-brand transition-colors duration-150 hover:border-brand-primary active:bg-bg-hover',
        className,
      )}
    >
      <span lang={target} className={target === 'ar' ? 'type-label-language' : 'type-label-small-strong'}>
        {t('switchTo')}
      </span>
    </Link>
  );
}

function CurrentPathToggle({ className }: { className?: string }) {
  return <ToggleLink href={usePathname()} className={className} />;
}

/**
 * With Cache Components, `usePathname` suspends on routes whose params are only known at request time, so the
 * toggle renders inside its own Suspense boundary; until then it links to the other locale's home page.
 */
export function LanguageToggle({ className }: { className?: string }) {
  return (
    <Suspense fallback={<ToggleLink href="/" className={className} />}>
      <CurrentPathToggle className={className} />
    </Suspense>
  );
}
