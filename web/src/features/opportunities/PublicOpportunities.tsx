import { getApiBaseUrl } from '@/lib/api/config';
import { Surface } from '@/components/ui/Surface';
import { Link } from '@/i18n/navigation';
import { PublicOpportunityEmpty } from './PublicOpportunityEmpty';

type Opportunity = {
  id: string;
  farmName: string;
  governorate: string;
  areaName: string | null;
  areaFeddan: number;
  reviewStatus: 'approved';
  professionalNeed?: string;
  managementTypes?: string[] | null;
  goals?: string[] | null;
  description?: string | null;
  objective?: string[] | null;
};
export async function PublicOpportunities({
  kind,
  locale,
  page,
}: {
  kind: 'management' | 'partnerships';
  locale: string;
  page: number;
}) {
  const ar = locale === 'ar';
  let data: { items: Opportunity[]; total: number; pageSize: number } | null = null;
  try {
    const response = await fetch(getApiBaseUrl() + '/public/' + kind + '?page=' + page, { cache: 'no-store' });
    if (response.ok) data = await response.json();
  } catch {
    /* Render a recoverable error when the API is unavailable. */
  }
  if (!data)
    return (
      <Surface className="p-28" role="status">
        {ar ? 'تعذر تحميل الفرص. يرجى المحاولة مرة أخرى.' : 'Unable to load opportunities. Please try again.'}
      </Surface>
    );
  if (!data.items.length) return <PublicOpportunityEmpty kind={kind} locale={locale} />;
  return (
    <>
      <div className="grid gap-24 tablet:grid-cols-2">
        {data.items.map((item) => (
          <Surface key={item.id} className="flex flex-col gap-12 p-28">
            <span className="type-label-medium text-text-brand">
              {item.reviewStatus === 'approved' && (ar ? 'تمت المراجعة بواسطة FarmExit' : 'Reviewed by FarmExit')}
            </span>
            <h2 className="type-heading-h4">{item.farmName}</h2>
            <p>
              {[item.governorate, item.areaName].filter(Boolean).join(' · ')} · {item.areaFeddan.toLocaleString(locale)}{' '}
              {ar ? 'فدان' : 'feddans'}
            </p>
            {item.professionalNeed && (
              <p>
                {item.professionalNeed === 'farmManager'
                  ? ar
                    ? 'مطلوب مدير مزرعة'
                    : 'Farm manager wanted'
                  : ar
                    ? 'مطلوب مهندس زراعي'
                    : 'Agricultural engineer wanted'}
              </p>
            )}
            {item.description && <p className="whitespace-pre-wrap">{item.description}</p>}
            {(item.goals ?? item.objective)?.map((goal, index) => (
              <p key={index}>{goal}</p>
            ))}
          </Surface>
        ))}
      </div>
      <nav aria-label={ar ? 'الصفحات' : 'Pagination'} className="flex gap-24">
        {page > 1 && (
          <Link href={{ pathname: '/' + kind, query: { page: page - 1 } }}>{ar ? 'السابق' : 'Previous'}</Link>
        )}
        {page * data.pageSize < data.total && (
          <Link href={{ pathname: '/' + kind, query: { page: page + 1 } }}>{ar ? 'التالي' : 'Next'}</Link>
        )}
      </nav>
    </>
  );
}
