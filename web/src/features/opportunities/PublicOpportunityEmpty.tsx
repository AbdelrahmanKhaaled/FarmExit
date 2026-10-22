import { Icon } from '@/components/icons/Icon';
import { ButtonLink } from '@/components/ui/Button';

type Props = {
  kind: 'management' | 'partnerships';
  locale: string;
};

export function PublicOpportunityEmpty({ kind, locale }: Props) {
  const ar = locale === 'ar';
  const isManagement = kind === 'management';
  const title = ar
    ? isManagement
      ? 'لا توجد فرص إدارة منشورة بعد'
      : 'لا توجد فرص شراكة منشورة بعد'
    : isManagement
      ? 'No published management opportunities yet'
      : 'No published partnership opportunities yet';
  const body = ar
    ? 'الطلبات المعتمدة تبقى خاصة حتى يوافق FarmExit على نشرها للجمهور. يمكنك تقديم طلبك الآن ومتابعته من حسابك.'
    : 'Approved owner requests stay private until FarmExit authorizes a separate publication step. You can submit your request now and track it in My FarmExit.';
  const ownerHref = isManagement ? '/my/management/new' : '/my/partnerships/new';
  const trackHref = isManagement ? '/my/management' : '/my/partnerships';
  const ownerCta = ar
    ? isManagement
      ? 'قدّم طلب إدارة مزرعة'
      : 'قدّم طلب شراكة'
    : isManagement
      ? 'Submit a management request'
      : 'Submit a partnership request';
  const trackCta = ar ? 'تابع طلباتك' : 'Track your requests';

  return (
    <section
      className="flex flex-col items-center gap-20 rounded-card border border-border-hairline bg-bg-surface px-28 py-48 text-center"
      data-testid={`${kind}-marketplace-empty`}
    >
      <span className="flex size-80 items-center justify-center rounded-full bg-bg-success-soft text-text-brand">
        <Icon name={isManagement ? 'building' : 'category'} size={36} />
      </span>
      <h2 className="type-heading-h4 text-text-primary">{title}</h2>
      <p className="max-w-560 type-body-default text-text-muted">{body}</p>
      <div className="flex flex-wrap justify-center gap-12">
        <ButtonLink href={ownerHref} variant="primary" size="md">{ownerCta}</ButtonLink>
        <ButtonLink href={trackHref} variant="outline" size="md">{trackCta}</ButtonLink>
      </div>
    </section>
  );
}
