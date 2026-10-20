import Image from 'next/image';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Logo } from '@/components/brand/Logo';
import { Icon } from '@/components/icons/Icon';
import { AuthDialog } from './AuthDialog';
import { AuthClose } from './AuthClose';

/** Authentication PDF p11–12; Arabic p4–5. */
export function AuthScreen({ children, modal = false }: { children: ReactNode; modal?: boolean }) {
  const t = useTranslations('auth.visual');
  if (modal) return <AuthDialog>{children}</AuthDialog>;
  return (
    <main className="min-h-dvh bg-bg-surface tablet:grid tablet:grid-cols-[46%_1fr]" data-testid="auth-screen">
      <aside className="relative hidden min-h-dvh overflow-hidden bg-brand-deep tablet:flex tablet:flex-col tablet:justify-between tablet:p-40 desktop:p-56">
        <Image src="/images/home/hero.jpg" alt="" fill priority sizes="46vw" className="object-cover" />
        <div className="absolute inset-0 fx-shade-hero" />
        <div className="relative">
          <Logo tone="dark" variant="horizontal" />
        </div>
        <div className="relative flex flex-col gap-24 pt-144">
          <h2 className="type-heading-h1-section text-text-on-dark">{t('headline')}</h2>
          <ul className="flex flex-col gap-14 rounded-card border border-overlay-glass-border bg-overlay-deep-glass p-24 effect-hero-glass">
            {(['oneAccount', 'review', 'private'] as const).map((key) => (
              <li key={key} className="flex items-start gap-12 type-label-small-strong text-text-on-dark">
                <Icon name="verify-filled" size={18} className="shrink-0 text-brand-gold" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <div className="relative flex min-h-dvh flex-col px-24 pb-40 pt-24 tablet:px-40 desktop:px-64">
        <header className="flex items-center justify-between gap-16 tablet:justify-end">
          <span className="tablet:hidden">
            <Logo variant="icon" height={36} />
          </span>
          <AuthClose />
        </header>
        <div className="mx-auto flex w-full max-w-400 flex-1 flex-col justify-start pb-40 pt-40 tablet:justify-center tablet:py-64">
          {children}
        </div>
      </div>
    </main>
  );
}
