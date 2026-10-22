import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { MessagesWorkspace } from '@/features/my-messages/MessagesWorkspace';

export default async function ConversationPage({ params }: PageProps<'/[locale]/my/messages/[caseId]'>) {
  const { locale, caseId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('workspace.messages');
  const session = await requireCompletedProfile(locale, `/${locale}/my/messages/${caseId}`);
  return (
    <div className="fx-messages-host flex min-h-0 min-w-0 flex-1 flex-col gap-16">
      <div className="desktop:hidden">
        <h2 className="type-display-h4">{t('title')}</h2>
        <p className="mt-8 type-body-caption text-text-muted">{t('intro')}</p>
      </div>
      <MessagesWorkspace caseId={caseId} userId={session.user.id} />
    </div>
  );
}
