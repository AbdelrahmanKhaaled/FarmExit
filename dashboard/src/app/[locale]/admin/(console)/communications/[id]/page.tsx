import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { RefreshButton } from '@/features/admin/RefreshButton';
import {
  CommunicationCaseWorkspace,
  type CaseMessage,
  type ConversationSummary,
} from '@/features/admin/communications/CommunicationCaseWorkspace';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin, apiFetchAdminResult, getAdminSession } from '@/lib/admin/session.server';
import { routing } from '@/i18n/routing';

type CaseDetail = {
  id: string;
  requestId: string;
  status: string;
  assignedStaffId: string;
};

type MessageList = {
  items: CaseMessage[];
  page: number;
  pageSize: number;
  total: number;
};

export default async function CommunicationCasePage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/communications/[id]'> & { searchParams: Promise<{ conversationId?: string }> }) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const sp = await searchParams;
  const t = await getTranslations('admin.communicationsDetail');

  const caseRes = await apiFetchAdminResult<CaseDetail>(`/staff/communication/cases/${id}`, session.accessToken);
  if (!caseRes.ok) {
    if (caseRes.status === 404 || caseRes.status === 403) notFound();
    throw new Error(caseRes.message ?? id);
  }
  const caseRow = caseRes.data;

  const conversations = await apiFetchAdmin<ConversationSummary[]>(
    `/staff/communication/cases/${id}/conversations`,
    session.accessToken,
  );
  const activeConversationId = sp.conversationId ?? conversations[0]?.id ?? null;

  let messages: CaseMessage[] = [];
  if (activeConversationId) {
    const msgQs = new URLSearchParams({ page: '1', pageSize: '50', conversationId: activeConversationId });
    const msgData = await apiFetchAdmin<MessageList>(
      `/staff/communication/cases/${id}/messages?${msgQs}`,
      session.accessToken,
    );
    messages = msgData.items;
  }

  return (
    <PageContainer>
      <div className="mb-6 flex justify-between">
        <div>
          <Link href="/admin/communications" className="text-xs text-[var(--admin-brand-primary)] hover:underline">{t('back')}</Link>
          <h1 className="mt-1 text-2xl font-semibold">{t('title', { id })}</h1>
          <p className="text-sm">
            <Link href={`/admin/requests/${caseRow.requestId}`} className="text-[var(--admin-brand-primary)] hover:underline">
              {t('openRequest')}
            </Link>
          </p>
        </div>
        <RefreshButton label={t('refresh')} />
      </div>
      <CommunicationCaseWorkspace
        caseId={id}
        requestId={caseRow.requestId}
        status={caseRow.status}
        conversations={conversations}
        messages={messages}
        activeConversationId={activeConversationId}
      />
    </PageContainer>
  );
}
