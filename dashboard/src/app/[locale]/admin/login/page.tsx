import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { Logo } from '@/components/brand/Logo';
import { AdminLoginForm } from '@/features/admin/AdminLoginForm';
import { getAdminSession } from '@/lib/admin/session.server';
import { getStaffHomePath } from '@/lib/admin/console-routes';
import { staffHasConsoleAccess } from '@/lib/admin/staff-permissions';
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
  if (session && staffHasConsoleAccess(session.staff)) {
    redirect({ href: getStaffHomePath(session.staff), locale });
  }
  const t = await getTranslations({ locale, namespace: 'admin.login' });

  return (
    <div className="grid min-h-dvh w-full min-w-0 bg-[var(--admin-bg-canvas)] lg:grid-cols-2">
      <section
        className="relative hidden min-w-0 flex-col justify-between overflow-x-hidden p-10 text-white lg:flex [html[dir=rtl]_&]:lg:order-2"
        style={{
          background:
            'linear-gradient(165deg, var(--admin-sidebar-bg) 0%, #1a3830 45%, #0f1f1a 100%)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(201,162,39,0.12),transparent_55%)]" aria-hidden />
        <Logo variant="full" tone="dark" height={72} priority className="relative z-10" />
        <div className="relative z-10 max-w-md space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--admin-brand-gold)]">{t('panelTagline')}</p>
          <p className="text-lg leading-relaxed text-white/90">{t('panelBody')}</p>
        </div>
        <p className="relative z-10 text-xs text-white/50">{t('panelFooter')}</p>
      </section>
      <section className="flex min-w-0 flex-col justify-center bg-[var(--admin-bg-canvas)] px-6 py-12 md:px-16 [html[dir=rtl]_&]:lg:order-1">
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
