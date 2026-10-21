'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { TextInput, Select } from '@/components/ui/Field';
import { Surface } from '@/components/ui/Surface';

const EXCHANGE_ASSETS = ['factory', 'villa', 'apartment', 'car'] as const;

type SaleTerms = {
  saleMode: string;
  acceptsCashProposals: boolean;
  acceptsInstallmentProposals: boolean;
  acceptsExchangeProposals: boolean;
  exchangePreferenceScope: string;
  exchangeAssetTypes: string[];
  configured: boolean;
};

type ProposalKind = 'cash' | 'installment' | 'exchange' | 'mixed' | 'coPurchase';

function allowedKinds(terms: SaleTerms | null): ProposalKind[] {
  if (!terms) return [];
  const kinds: ProposalKind[] = [];
  if (terms.acceptsCashProposals) kinds.push('cash', 'coPurchase');
  if (terms.acceptsInstallmentProposals) kinds.push('installment');
  if (terms.acceptsExchangeProposals) kinds.push('exchange');
  if (terms.acceptsExchangeProposals && terms.acceptsCashProposals) kinds.push('mixed');
  if (terms.saleMode === 'standardCash') return kinds.filter((k) => k === 'cash' || k === 'coPurchase');
  return kinds;
}

function assetOptions(terms: SaleTerms | null): string[] {
  if (!terms?.acceptsExchangeProposals) return [];
  if (terms.exchangePreferenceScope === 'selected' && terms.exchangeAssetTypes.length > 0) {
    return terms.exchangeAssetTypes;
  }
  return [...EXCHANGE_ASSETS];
}

export function NewPurchaseProposalForm({ slug, farmName }: { slug: string; farmName?: string }) {
  const t = useTranslations('workspace.proposals');
  const router = useRouter();
  const [terms, setTerms] = useState<SaleTerms | null>(null);
  const [kind, setKind] = useState<ProposalKind>('cash');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const res = await fetch(`/api/marketplace/farms/${encodeURIComponent(slug)}/sale-terms`);
      if (!active) return;
      if (res.ok) {
        const data = (await res.json()) as SaleTerms;
        setTerms(data);
        setKind(allowedKinds(data)[0] ?? 'cash');
      } else setError(t('submitError'));
      setLoading(false);
    })().catch(() => {
      if (active) {
        setError(t('submitError'));
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [slug, t]);

  const kinds = allowedKinds(terms);
  const assets = useMemo(() => assetOptions(terms), [terms]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    const proposalKind = String(form.get('proposalKind')) as ProposalKind;
    const notes = String(form.get('notes') ?? '').trim() || undefined;
    const components: Record<string, unknown>[] = [];
    let proposedTotalValue: number | undefined;
    let requestedSharePercent: number | undefined;

    if (proposalKind === 'cash') {
      const amount = Number(form.get('amount'));
      components.push({ componentType: 'cash', proposedValue: amount });
      proposedTotalValue = amount;
    } else if (proposalKind === 'installment') {
      const amount = Number(form.get('amount'));
      components.push({
        componentType: 'installments',
        proposedValue: amount,
        installmentCount: Number(form.get('installmentCount')),
        installmentInterval: String(form.get('installmentInterval') ?? 'monthly'),
      });
      proposedTotalValue = amount;
    } else if (proposalKind === 'exchange' || proposalKind === 'mixed') {
      const assetValue = Number(form.get('assetValue'));
      const assetType = String(form.get('assetType'));
      const assetDescription = String(form.get('assetDescription') ?? '').trim() || undefined;
      components.push({
        componentType: 'exchangeAsset',
        proposedValue: assetValue,
        assetType,
        assetDescription,
      });
      proposedTotalValue = assetValue;
      if (proposalKind === 'mixed') {
        const cashAmount = Number(form.get('cashAmount'));
        components.push({ componentType: 'cash', proposedValue: cashAmount });
        proposedTotalValue += cashAmount;
      }
    } else if (proposalKind === 'coPurchase') {
      requestedSharePercent = Number(form.get('sharePercent'));
      const cashPart = Number(form.get('cashPart') ?? 0);
      if (cashPart > 0) {
        components.push({ componentType: 'cash', proposedValue: cashPart });
        proposedTotalValue = cashPart;
      }
    } else {
      setError(t('submitError'));
      return;
    }

    lock.current = true;
    setPending(true);
    try {
      const res = await fetch(`/api/marketplace/farms/${encodeURIComponent(slug)}/purchase-proposals`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          proposalKind,
          proposedTotalValue,
          requestedSharePercent,
          proposalNotes: notes,
          components,
        }),
      });
      if (!res.ok) {
        setError(t('submitError'));
        return;
      }
      const created = (await res.json()) as { id: string };
      router.push(`/my/proposals/${created.id}`);
    } catch {
      setError(t('submitError'));
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return (
    <Surface className="p-24" data-testid="new-proposal-form">
      <p className="type-body-caption text-text-muted">{t('nonbindingNote')}</p>
      {farmName && <p className="mt-8 type-label-medium">{farmName}</p>}
      {loading ? (
        <p className="mt-12 type-body-caption text-text-muted">{t('loadingTerms')}</p>
      ) : terms && kinds.length > 0 ? (
        <form onSubmit={onSubmit} className="mt-24 flex flex-col gap-24">
          <fieldset disabled={pending} className="contents">
            <Select
              label={t('kind')}
              fieldStyle="form"
              name="proposalKind"
              value={kind}
              onChange={(e) => setKind(e.target.value as ProposalKind)}
            >
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {t(`kinds.${k}`)}
                </option>
              ))}
            </Select>
            {kind === 'coPurchase' && (
              <>
                <TextInput
                  label={t('sharePercent')}
                  name="sharePercent"
                  type="number"
                  min={0.01}
                  max={100}
                  step={0.01}
                  required
                  fieldStyle="form"
                />
                <p className="type-body-caption text-text-muted">{t('coPurchaseDisclaimer')}</p>
                <TextInput label={t('optionalCashPart')} name="cashPart" type="number" min={0} fieldStyle="form" />
              </>
            )}
            {(kind === 'cash' || kind === 'installment') && (
              <>
                <TextInput label={t('amountEgp')} name="amount" type="number" min={1} required fieldStyle="form" />
                {kind === 'installment' && (
                  <>
                    <TextInput
                      label={t('installmentCount')}
                      name="installmentCount"
                      type="number"
                      min={1}
                      required
                      fieldStyle="form"
                    />
                    <TextInput
                      label={t('installmentInterval')}
                      name="installmentInterval"
                      defaultValue="monthly"
                      fieldStyle="form"
                    />
                  </>
                )}
              </>
            )}
            {kind === 'mixed' && (
              <TextInput
                label={t('cashPartAmount')}
                name="cashAmount"
                type="number"
                min={1}
                required
                fieldStyle="form"
              />
            )}
            {(kind === 'exchange' || kind === 'mixed') && (
              <>
                <p className="type-body-caption text-text-muted">{t('exchangeDisclaimer')}</p>
                <Select label={t('assetType')} fieldStyle="form" name="assetType" required>
                  {assets.map((a) => (
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
                  fieldStyle="form"
                />
                <TextInput label={t('assetDescription')} name="assetDescription" fieldStyle="form" />
              </>
            )}
            <TextInput label={t('notes')} name="notes" fieldStyle="form" />
            <Button type="submit" variant="primary">
              {t('submit')}
            </Button>
            {error && (
              <p role="alert" className="type-body-caption text-status-error">
                {error}
              </p>
            )}
          </fieldset>
        </form>
      ) : (
        <p role="alert" className="mt-12 type-body-caption text-status-error">
          {error ?? t('submitError')}
        </p>
      )}
    </Surface>
  );
}
