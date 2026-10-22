import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';
import { UnifiedRequestsWorkspace } from '@/features/my-farmexit/UnifiedRequestsWorkspace';
import {
  REQUEST_FILTER_ORDER,
  shouldExcludeFromMyRequests,
  type RequestFilterCategory,
  type UnifiedRequestItem,
} from '@/features/my-farmexit/unified-requests';

type RequestItem = UnifiedRequestItem;

export default async function MyRequestsPage({
  params,
  searchParams,
}: PageProps<'/[locale]/my/requests'>) {
  const query = await searchParams;
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const requestedPage = Number(query.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const categoryParam = query.category ?? 'all';
  const category: RequestFilterCategory = REQUEST_FILTER_ORDER.includes(categoryParam as RequestFilterCategory)
    ? (categoryParam as RequestFilterCategory)
    : 'all';

  const session = await requireCompletedProfile(locale, `/${locale}/my/requests`);
  const data = await apiFetchWebsite<{ items: RequestItem[]; page: number; pageSize: number; total: number }>(
    `/requests?page=${page}&pageSize=50`,
    session.accessToken,
  );
  const items = data.items.filter((item) => !shouldExcludeFromMyRequests(item.requestType));

  return (
    <UnifiedRequestsWorkspace
      items={items}
      page={data.page}
      pageSize={data.pageSize}
      total={data.total}
      category={category}
    />
  );
}
