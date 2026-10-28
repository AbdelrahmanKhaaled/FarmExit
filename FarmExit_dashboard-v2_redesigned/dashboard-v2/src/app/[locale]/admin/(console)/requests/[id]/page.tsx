import { Suspense } from 'react';
import ConsoleLoading from '@/app/[locale]/admin/(console)/loading';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { apiFetchAdminResult } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import { RequestWorkspace } from '@/features/admin/requests/RequestWorkspace';
import type { ApplicationFilters } from '@/features/admin/requests/linked-applications';
import type { StaffRequestDetail } from '@/lib/api/types/staff';
import { routing } from '@/i18n/routing';

async function RequestDetailPageContent({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/requests/[id]'> & { searchParams: Promise<ApplicationFilters> }) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'requestDetail');
  const result = await apiFetchAdminResult<StaffRequestDetail>(`/staff/requests/${id}`, session.accessToken);
  if (!result.ok) {
    if (result.status === 403 || result.status === 404) notFound();
    throw new Error(result.message ?? `Request ${id}`);
  }
  return <RequestWorkspace request={result.data} session={session} locale={locale} filters={await searchParams} />;
}

export default function Page(props: Parameters<typeof RequestDetailPageContent>[0]) {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <RequestDetailPageContent {...props} />
    </Suspense>
  );
}
