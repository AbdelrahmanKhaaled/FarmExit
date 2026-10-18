import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function AdminNotFound() {
  const t = await getTranslations('admin.notFound');
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold text-[var(--admin-text-primary)]">{t('title')}</h1>
      <p className="mt-3 max-w-md text-[var(--admin-text-muted)]">{t('body')}</p>
      <Link
        href="/admin"
        className="mt-8 rounded-[var(--admin-radius-md)] bg-[var(--admin-brand-primary)] px-5 py-2.5 text-sm font-semibold text-white"
      >
        {t('home')}
      </Link>
    </div>
  );
}
