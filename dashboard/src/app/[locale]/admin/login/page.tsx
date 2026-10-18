import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { Logo } from '@/components/brand/Logo';
import { AdminLoginForm } from '@/features/admin/AdminLoginForm';
import { getAdminSession } from '@/lib/admin/session.server';
import { routing } from '@/i18n/routing';

export async function generateMetadata({ params }: PageProps<'/[locale]/admin/login'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'admin.meta' });
  return { title: t('title'), description: t('description') };
}

export default async function AdminLoginPage({ params }: PageProps<'/[locale]/admin/login'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (session?.isAdmin) {
    redirect({ href: '/admin', locale });
  }
  const t = await getTranslations({ locale, namespace: 'admin.login' });

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{ background: 'var(--admin-sidebar-bg)' }}
      >
        <Logo variant="full" tone="dark" height={72} priority />
        <div className="max-w-md space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--admin-brand-gold)]">{t('panelTagline')}</p>
          <p className="text-lg leading-relaxed text-white/90">{t('panelBody')}</p>
        </div>
        <div
          className="pointer-events-none absolute -end-24 -top-24 h-64 w-64 rounded-full border border-white/10 opacity-40"
          aria-hidden
        />
      </section>
      <section className="flex flex-col justify-center px-6 py-12 md:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo variant="horizontal" tone="light" height={44} priority />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--admin-text-primary)]">{t('title')}</h1>
          <p className="mt-2 text-sm text-[var(--admin-text-muted)]">{t('subtitle')}</p>
          <div className="mt-8">
            <AdminLoginForm />
          </div>
        </div>
      </section>
    </div>
  );
}
