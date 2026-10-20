import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { MessagesInbox } from '@/features/my-messages/MessagesInbox';

export default async function MyMessagesPage({ params }: PageProps<'/[locale]/my/messages'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('workspace.messages');
  await requireCompletedProfile(locale, `/${locale}/my/messages`);
  return (
    <div className="flex flex-col gap-16">
      <h2 className="type-display-h4">{t('title')}</h2>
      <p className="type-body-caption text-text-muted">{t('intro')}</p>
      <MessagesInbox />
    </div>
  );
}
