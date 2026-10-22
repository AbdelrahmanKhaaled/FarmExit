import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { DetailWorkspace } from '@/design-system/workspace/DetailWorkspace';
import {
  CommunicationCaseWorkspace,
  type CaseMessage,
  type ConversationSummary,
} from '@/features/admin/communications/CommunicationCaseWorkspace';
import { AdminDetailHeader } from '@/features/admin/workspace/AdminDetailHeader';
import { AdminDetailSection } from '@/features/admin/workspace/AdminDetailSection';
import { EntityLink } from '@/features/admin/workspace/EntityLink';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin, apiFetchAdminResult } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
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
  const session = await requireConsolePage(locale, 'communicationDetail');
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
  let messagePage = 1;
  let messageTotal = 0;
  let messagePageSize = 50;
  if (activeConversationId) {
    const msgQs = new URLSearchParams({ page: '1', pageSize: '50', conversationId: activeConversationId });
    const msgData = await apiFetchAdmin<MessageList>(
      `/staff/communication/cases/${id}/messages?${msgQs}`,
      session.accessToken,
    );
    messages = msgData.items;
    messagePage = msgData.page;
    messageTotal = msgData.total;
    messagePageSize = msgData.pageSize;
  }

  return (
    <PageContainer>
      <AdminDetailHeader
        backHref="/admin/communications"
        backLabel={t('back')}
        title={t('title', { id })}
        status={caseRow.status}
        statusGroup="caseStatus"
        refreshLabel={t('refresh')}
        subtitle={
          <Link href={`/admin/requests/${caseRow.requestId}`} className="text-sm font-semibold text-[var(--admin-brand-primary)] hover:underline">
            {t('openRequest')}
          </Link>
        }
      />
      <DetailWorkspace
        main={
          <CommunicationCaseWorkspace
            key={`${id}:${activeConversationId ?? ''}`}
            caseId={id}
            requestId={caseRow.requestId}
            status={caseRow.status}
            conversations={conversations}
            messages={messages}
            messagePage={messagePage}
            messageTotal={messageTotal}
            messagePageSize={messagePageSize}
            activeConversationId={activeConversationId}
            hideRequestBanner
          />
        }
        aside={
          <AdminDetailSection title={t('caseContext')}>
            <dl className="admin-detail-dl">
              <div>
                <dt>{t('requestContext')}</dt>
                <dd className="mt-1">
                  <EntityLink href={`/admin/requests/${caseRow.requestId}`} label={caseRow.requestId} />
                </dd>
              </div>
              <div>
                <dt>{t('assignedStaff')}</dt>
                <dd className="mt-1 font-mono text-xs break-all" title={caseRow.assignedStaffId}>
                  {caseRow.assignedStaffId}
                </dd>
              </div>
              <div>
                <dt>{t('caseStatus')}</dt>
                <dd className="mt-1"><StatusBadge status={caseRow.status} group="caseStatus" /></dd>
              </div>
            </dl>
          </AdminDetailSection>
        }
      />
    </PageContainer>
  );
}
