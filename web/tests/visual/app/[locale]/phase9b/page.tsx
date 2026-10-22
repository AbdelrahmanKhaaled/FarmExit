import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MyFarmExitLayout } from '@/features/my-farmexit/MyFarmExitLayout';
import { MessagesWorkspace } from '@/features/my-messages/MessagesWorkspace';
import type { WebsiteSession } from '@/lib/auth/session.server';

const preview = (locale: string) => ({
  cases: [
    {
      id: '42',
      requestId: '9001',
      status: 'open',
      createdAt: '2026-09-28T10:00:00.000Z',
      closedAt: null,
    },
    {
      id: '43',
      requestId: '9002',
      status: 'waitingCustomer',
      createdAt: '2026-09-20T10:00:00.000Z',
      closedAt: null,
    },
  ],
  caseRow: {
    id: '42',
    requestId: '9001',
    status: 'open',
    createdAt: '2026-09-28T10:00:00.000Z',
    closedAt: null,
  },
          request: {
            id: '9001',
            requestNumber: 'REQ-VIS-9001',
            requestType: 'farmDetails',
            status: 'approved',
            farm: { id: '1', name: locale === 'ar' ? 'مزرعة نوبارية' : 'Nubaria reference farm', governorate: null },
          },
          messages: [
    {
      id: '1',
      senderId: 'visual-user',
      body:
        locale === 'ar'
          ? 'مرحباً — هل يمكن مشاركة ملخص ترخيص المياه؟'
          : 'Hello — could you share the water licence summary?',
      sentAt: '2026-09-28T15:20:00.000Z',
      isRelayedCopy: false,
    },
    {
      id: '2',
      senderId: 'staff-1',
      body:
        locale === 'ar'
          ? 'مرحباً — المالك شارك ملخص ترخيص المياه.'
          : 'Hello — the owner shared the water licence summary.',
      sentAt: '2026-09-30T07:15:00.000Z',
      isRelayedCopy: true,
    },
    {
      id: '3',
      senderId: 'visual-user',
      body: locale === 'ar' ? 'شكراً — هل يمكن السؤال عن محصول الموسم الماضي؟' : 'Thanks — could you ask about last season yield?',
      sentAt: '2026-10-01T08:40:00.000Z',
      isRelayedCopy: false,
    },
  ],
});

export default async function Phase9bFixture({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ screen?: string }>;
}) {
  if (process.env.FARMEXIT_VISUAL_TEST !== '1') notFound();
  const { locale } = await params;
  const { screen } = await searchParams;
  if (locale !== 'en' && locale !== 'ar') notFound();
  setRequestLocale(locale);
  const t = await getTranslations('workspace.messages');
  const data = preview(locale);
  const session: WebsiteSession = {
    user: {
      id: 'visual-user',
      fullName: locale === 'ar' ? 'أحمد' : 'Ahmed',
      mobileE164: '+201000000000',
      email: null,
      mobileVerified: true,
      profileCompleted: true,
    },
    accessToken: 'visual',
  };

  const inboxOnly = screen === 'inbox';
  const mobileThread = screen === 'mobile';

  return (
    <MyFarmExitLayout session={session}>
      <div className="flex flex-col gap-16">
        <div className={mobileThread ? 'hidden desktop:block' : undefined}>
          <h2 className="type-display-h4">{t('title')}</h2>
          <p className="mt-8 type-body-caption text-text-muted">{t('intro')}</p>
        </div>
        {inboxOnly ? (
          <MessagesWorkspace preview={data} />
        ) : (
          <MessagesWorkspace caseId="42" userId="visual-user" preview={data} />
        )}
      </div>
    </MyFarmExitLayout>
  );
}
