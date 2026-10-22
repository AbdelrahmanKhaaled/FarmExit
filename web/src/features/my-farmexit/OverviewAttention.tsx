import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/icons/Icon';
import { PortalStatus } from './PortalUI';
import { needsAttention, resolveRequestAction, type UnifiedRequestItem } from './unified-requests';

export async function OverviewAttention({ items }: { items: UnifiedRequestItem[] }) {
  const attention = items.filter(needsAttention);
  if (!attention.length) return null;
  const t = await getTranslations('workspace.unifiedRequests');

  return (
    <section className="flex flex-col gap-16 rounded-card border border-overlay-gold-hairline bg-bg-notice/40 p-24">
      <header className="flex items-center gap-10">
        <Icon name="notification" size={22} className="text-text-gold" />
        <h3 className="type-heading-h4 text-text-primary">{t('attentionTitle')}</h3>
      </header>
      <ul className="flex flex-col gap-12">
        {attention.slice(0, 5).map((item) => {
          const { href, actionKey } = resolveRequestAction(item);
          return (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-12 rounded-lg bg-bg-surface px-16 py-12">
              <div className="min-w-0">
                <p className="type-label-small-strong wrap-anywhere text-text-primary">{item.requestNumber}</p>
                <PortalStatus status={item.status} />
              </div>
              <Link href={href} className="type-label-small-strong text-text-brand">
                {t(`actions.${actionKey}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
