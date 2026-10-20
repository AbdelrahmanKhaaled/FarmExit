import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { MessageThread } from '@/features/my-messages/MessageThread';

export default async function ConversationPage({ params }: PageProps<'/[locale]/my/messages/[caseId]'>) {
  const { locale, caseId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('workspace.messages');
  const session = await requireCompletedProfile(locale, `/${locale}/my/messages/${caseId}`);
  return (
    <div className="flex flex-col gap-16">
      <Link href="/my/messages" className="type-label-button text-text-brand">
        {t('back')}
      </Link>
      <h2 className="type-display-h4">{t('conversationTitle')}</h2>
      <MessageThread caseId={caseId} userId={session.user.id} />
    </div>
  );
}
