import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

type Props = {
  requestId: string;
  variant?: 'primary' | 'secondary';
};

export async function RequestHubForwardingLink({ requestId, variant = 'primary' }: Props) {
  const t = await getTranslations('admin.requestForwarding');
  const className =
    variant === 'secondary'
      ? 'text-xs text-[var(--admin-text-muted)] hover:underline'
      : 'text-sm font-medium text-[var(--admin-brand-primary)] hover:underline';
  return (
    <p>
      <Link href={`/admin/requests/${requestId}#forwarding`} className={className}>
        {t('openOnRequestHub')}
      </Link>
    </p>
  );
}
