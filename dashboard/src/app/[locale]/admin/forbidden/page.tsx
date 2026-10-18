import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

export default async function AdminForbiddenPage({ params }: PageProps<'/[locale]/admin/forbidden'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('admin.forbidden');
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold text-[var(--admin-text-primary)]">{t('title')}</h1>
      <p className="mt-3 max-w-md text-[var(--admin-text-muted)]">{t('body')}</p>
      <Link
        href="/admin/login"
        className="mt-8 rounded-[var(--admin-radius-md)] bg-[var(--admin-brand-primary)] px-5 py-2.5 text-sm font-semibold text-white"
      >
        {t('back')}
      </Link>
    </div>
  );
}
