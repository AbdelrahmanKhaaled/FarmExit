import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Surface';
import { ButtonLink } from '@/components/ui/Button';
import { PortalHeading, PortalStatus } from '@/features/my-farmexit/PortalUI';
import { RequestDocumentsPanel } from '@/features/my-farms/RequestDocumentsPanel';

export function RequestTracking({
  id,
  requestNumber,
  status,
  title,
  fields,
  reviews,
  history = [],
  editHref,
}: {
  id: string;
  requestNumber: string;
  status: string;
  title: string;
  fields: [string, string | null][];
  reviews: { decision: string; comment: string | null; createdAt: string | null }[];
  history?: { toStatus: string; reason: string | null; createdAt: string | null }[];
  editHref?: string;
}) {
  const t = useTranslations('workspace.phase7');
  return (
    <div data-testid="phase7-tracking" className="flex flex-col gap-24">
      <PortalHeading title={title} description={requestNumber} action={<PortalStatus status={status} />} />
      <p className="type-body-default text-text-muted">{t('private')}</p>
      <div className="grid items-start gap-24 tablet:grid-cols-[minmax(0,1fr)_minmax(240px,0.65fr)]">
        <div className="flex min-w-0 flex-col gap-24">
          <Card>
            <h3 className="type-label-large">{t('details')}</h3>
            <dl className="mt-24 flex flex-col gap-16">
              {fields.map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-2 gap-16 border-b border-border-subtle pb-12 type-body-caption"
                >
                  <dt className="text-text-muted">{label}</dt>
                  <dd className="whitespace-pre-line wrap-anywhere">{value || t('notProvided')}</dd>
                </div>
              ))}
            </dl>
            {editHref && (
              <ButtonLink href={editHref} variant="outline" className="mt-24">
                {t('edit')}
              </ButtonLink>
            )}
          </Card>
          <Card>
            <h3 className="type-label-large">{t('feedback')}</h3>
            {reviews.length ? (
              reviews.map((r, i) => (
                <div key={i} className="mt-16 border-t border-border-subtle pt-16">
                  <PortalStatus status={r.decision} />
                  {r.comment && <p className="mt-8 type-body-default">{r.comment}</p>}
                </div>
              ))
            ) : (
              <p className="mt-12 type-body-caption text-text-muted">{t('noFeedback')}</p>
            )}
          </Card>
          {history.length > 0 && (
            <Card>
              <h3 className="type-label-large">{t('history')}</h3>
              <ol className="mt-20 flex flex-col gap-16">
                {history.map((h, i) => (
                  <li key={i} className="border-s-2 border-brand-primary ps-16">
                    <PortalStatus status={h.toStatus} />
                    {h.reason && <p className="mt-8 type-body-caption">{h.reason}</p>}
                    {h.createdAt && (
                      <time dateTime={h.createdAt} className="mt-8 block type-label-caption text-text-muted">
                        {h.createdAt.slice(0, 10)}
                      </time>
                    )}
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-24">
          <RequestDocumentsPanel requestId={id} canEdit={false} />
          <Card surface="muted">
            <h3 className="type-label-large">{t('communication')}</h3>
            <p className="mt-12 type-body-caption text-text-muted">{t('communicationNote')}</p>
            <ButtonLink href="/my/messages" variant="outline" className="mt-16">
              {t('help')}
            </ButtonLink>
          </Card>
        </div>
      </div>
    </div>
  );
}
