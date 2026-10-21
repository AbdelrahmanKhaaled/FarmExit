'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { TextInput, Select } from '@/components/ui/Field';
import { Surface } from '@/components/ui/Surface';
import { OpenCommunicationCaseButton } from '@/features/my-messages/OpenCommunicationCaseButton';

export type PurchaseProposal = {
  id: string;
  requestNumber: string;
  listingId: string;
  proposalKind: string;
  proposedTotalValue: number | null;
  requestedSharePercent: string | null;
  proposalNotes: string | null;
  status: string;
  submittedAt: string | null;
  components: {
    componentType: string;
    proposedValue: number | null;
    assetType: string | null;
    assetDescription: string | null;
    installmentCount: number | null;
    installmentInterval: string | null;
  }[];
};

const EXCHANGE_ASSETS = ['factory', 'villa', 'apartment', 'car'];

export function ProposalDetail({ proposal: initial }: { proposal: PurchaseProposal }) {
  const t = useTranslations('workspace.proposals');
  const [proposal, setProposal] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const canEdit = proposal.status === 'submitted';

  const cash = proposal.components.find((c) => c.componentType === 'cash');
  const installments = proposal.components.find((c) => c.componentType === 'installments');
  const asset = proposal.components.find((c) => c.componentType === 'exchangeAsset');

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit) return;
    if (lock.current) return;
    setError(null);
    setMessage(null);
    const form = new FormData(e.currentTarget);
    const kind = proposal.proposalKind;
    const notes = String(form.get('notes') ?? '').trim();
    const components: Record<string, unknown>[] = [];
    let proposedTotalValue: number | undefined;
    let requestedSharePercent: number | undefined;

    if (kind === 'cash') {
      const amount = Number(form.get('amount'));
      components.push({ componentType: 'cash', proposedValue: amount });
      proposedTotalValue = amount;
    } else if (kind === 'installment') {
      const amount = Number(form.get('amount'));
      components.push({
        componentType: 'installments',
        proposedValue: amount,
        installmentCount: Number(form.get('installmentCount')),
        installmentInterval: String(form.get('installmentInterval') ?? 'monthly'),
      });
      proposedTotalValue = amount;
    } else if (kind === 'exchange') {
      const assetValue = Number(form.get('assetValue'));
      components.push({
        componentType: 'exchangeAsset',
        proposedValue: assetValue,
        assetType: String(form.get('assetType')),
        assetDescription: String(form.get('assetDescription') ?? '').trim() || undefined,
      });
      proposedTotalValue = assetValue;
    } else if (kind === 'mixed') {
      const cashAmt = Number(form.get('cashAmount'));
      const assetValue = Number(form.get('assetValue'));
      components.push({ componentType: 'cash', proposedValue: cashAmt });
      components.push({
        componentType: 'exchangeAsset',
        proposedValue: assetValue,
        assetType: String(form.get('assetType')),
        assetDescription: String(form.get('assetDescription') ?? '').trim() || undefined,
      });
      proposedTotalValue = cashAmt + assetValue;
    } else if (kind === 'coPurchase') {
      requestedSharePercent = Number(form.get('sharePercent'));
      const amount = Number(form.get('cashPart') ?? 0);
      if (amount > 0) {
        components.push({ componentType: 'cash', proposedValue: amount });
        proposedTotalValue = amount;
      }
    } else {
      setError(t('editUnsupported'));
      return;
    }

    lock.current = true;
    setPending(true);
    try {
      const res = await fetch(`/api/purchase-proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          proposalKind: kind,
          proposedTotalValue,
          requestedSharePercent,
          proposalNotes: notes,
          components,
        }),
      });
      if (!res.ok) {
        setError(t('saveError'));
        return;
      }
      const updated = (await res.json()) as PurchaseProposal;
      setProposal(updated);
      setEditing(false);
      setMessage(t('saved'));
    } catch {
      setError(t('saveError'));
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-16" data-testid="proposal-detail">
      <h2 className="type-display-h4">{proposal.requestNumber}</h2>
      <p className="type-body-caption text-text-muted">{t('nonbindingNote')}</p>
      {canEdit && !editing && (
        <Button type="button" variant="outline" onClick={() => setEditing(true)}>
          {t('edit')}
        </Button>
      )}
      {editing ? (
        <Surface className="p-24">
          <form onSubmit={save} className="flex flex-col gap-24">
            <fieldset disabled={pending} className="contents">
              {proposal.proposalKind === 'coPurchase' && (
                <>
                  <TextInput
                    label={t('sharePercent')}
                    name="sharePercent"
                    type="number"
                    min={0.01}
                    max={100}
                    step={0.01}
                    required
                    defaultValue={proposal.requestedSharePercent ?? ''}
                    fieldStyle="form"
                  />
                  <p className="type-body-caption text-text-muted">{t('coPurchaseDisclaimer')}</p>
                  <TextInput
                    label={t('optionalCashPart')}
                    name="cashPart"
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={cash?.proposedValue ?? ''}
                    fieldStyle="form"
                  />
                </>
              )}
              {(proposal.proposalKind === 'cash' || proposal.proposalKind === 'installment') && (
                <>
                  <TextInput
                    label={t('amountEgp')}
                    name="amount"
                    type="number"
                    min={1}
                    required
                    defaultValue={cash?.proposedValue ?? installments?.proposedValue ?? undefined}
                    fieldStyle="form"
                  />
                  {proposal.proposalKind === 'installment' && (
                    <>
                      <TextInput
                        label={t('installmentCount')}
                        name="installmentCount"
                        type="number"
                        min={1}
                        required
                        defaultValue={installments?.installmentCount ?? undefined}
                        fieldStyle="form"
                      />
                      <TextInput
                        label={t('installmentInterval')}
                        name="installmentInterval"
                        defaultValue={installments?.installmentInterval ?? 'monthly'}
                        fieldStyle="form"
                      />
                    </>
                  )}
                </>
              )}
              {proposal.proposalKind === 'mixed' && (
                <TextInput
                  label={t('cashPartAmount')}
                  name="cashAmount"
                  type="number"
                  min={1}
                  required
                  defaultValue={cash?.proposedValue ?? undefined}
                  fieldStyle="form"
                />
              )}
              {(proposal.proposalKind === 'exchange' || proposal.proposalKind === 'mixed') && (
                <>
                  <Select
                    label={t('assetType')}
                    fieldStyle="form"
                    name="assetType"
                    required
                    defaultValue={asset?.assetType ?? EXCHANGE_ASSETS[0]}
                    className="rounded-lg border border-border-subtle px-12 py-8"
                  >
                    {EXCHANGE_ASSETS.map((a) => (
                      <option key={a} value={a}>
                        {(t as (k: string) => string)(`assetTypes.${a}`)}
                      </option>
                    ))}
                  </Select>
                  <TextInput
                    label={t('assetValueEgp')}
                    name="assetValue"
                    type="number"
                    min={1}
                    required
                    defaultValue={asset?.proposedValue ?? undefined}
                    fieldStyle="form"
                  />
                  <TextInput
                    label={t('assetDescription')}
                    name="assetDescription"
                    defaultValue={asset?.assetDescription ?? ''}
                    fieldStyle="form"
                  />
                </>
              )}
              <TextInput
                label={t('notes')}
                name="notes"
                defaultValue={proposal.proposalNotes ?? ''}
                fieldStyle="form"
              />
              <div className="flex gap-12">
                <Button type="submit" variant="primary">
                  {t('save')}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  {t('cancel')}
                </Button>
              </div>
              {error && (
                <p role="alert" className="type-body-caption text-status-error">
                  {error}
                </p>
              )}
            </fieldset>
          </form>
        </Surface>
      ) : (
        <Surface className="flex flex-col gap-8 p-24">
          <p>
            <span className="type-label-meta text-text-muted">{t('listing')}</span> {proposal.listingId}
          </p>
          <p>
            <span className="type-label-meta text-text-muted">{t('kind')}</span>{' '}
            {(t as (k: string) => string)(`kinds.${proposal.proposalKind}`)}
          </p>
          <p>
            <span className="type-label-meta text-text-muted">{t('status')}</span>{' '}
            {(t as (k: string, o?: { defaultValue?: string }) => string)(`statuses.${proposal.status}`, {
              defaultValue: proposal.status,
            })}
          </p>
          {proposal.proposedTotalValue != null && (
            <p>
              <span className="type-label-meta text-text-muted">{t('total')}</span> EGP{' '}
              {proposal.proposedTotalValue.toLocaleString()}
            </p>
          )}
          {proposal.requestedSharePercent != null && (
            <p>
              <span className="type-label-meta text-text-muted">{t('sharePercent')}</span>{' '}
              {proposal.requestedSharePercent}%
              <span className="type-body-caption text-text-muted"> — {t('coPurchaseDisclaimer')}</span>
            </p>
          )}
          {proposal.proposalNotes && <p className="type-body-caption text-text-secondary">{proposal.proposalNotes}</p>}
        </Surface>
      )}
      {message && <p className="type-body-caption text-text-brand">{message}</p>}
      {proposal.components.length > 0 && !editing && (
        <Surface className="p-24">
          <h3 className="type-heading-h4">{t('components')}</h3>
          <ul className="mt-12 flex flex-col gap-8">
            {proposal.components.map((c, i) => (
              <li key={i} className="type-body-caption text-text-secondary">
                {c.componentType}
                {c.assetType ? ` (${(t as (k: string) => string)(`assetTypes.${c.assetType}`)})` : ''}:{' '}
                {c.proposedValue != null ? `EGP ${c.proposedValue.toLocaleString()}` : '—'}
                {c.installmentCount != null ? ` · ${c.installmentCount} installments` : ''}
                {c.assetDescription ? ` · ${c.assetDescription}` : ''}
              </li>
            ))}
          </ul>
        </Surface>
      )}
      <OpenCommunicationCaseButton requestId={proposal.id} />
    </div>
  );
}
