'use client';
import { useRef, useState } from 'react';
import { SaleTermsEditor, type SaleTermsHandle } from '@/features/my-farms/SaleTermsEditor';
import { FilterPanel } from '@/features/marketplace/FilterPanel';
import { defaultFilters } from '@/lib/data/marketplace';
import { toSearchParams } from '@/features/marketplace/url-state';
import { marketplaceStateToApiQuery } from '@/lib/data/marketplace-api';
import { Button } from '@/components/ui/Button';
import { NewPurchaseProposalForm } from '@/features/my-proposals/NewPurchaseProposalForm';
import { ProposalDetail } from '@/features/my-proposals/ProposalDetail';
export function Stage1eFixture({ screen }: { screen?: string }) {
  const editor = useRef<SaleTermsHandle>(null);
  const [status, setStatus] = useState('');
  const [filters, setFilters] = useState(defaultFilters);
  if (screen === 'buyer')
    return (
      <main className="mx-auto max-w-656 p-16">
        <NewPurchaseProposalForm slug="stage1e-test" />
      </main>
    );
  if (screen === 'buyer-detail')
    return (
      <main className="mx-auto max-w-656 p-16">
        <ProposalDetail
          proposal={{
            id: '3001',
            requestNumber: 'STAGE1E-TEST',
            listingId: '2001',
            proposalKind: 'exchange',
            proposedTotalValue: 250000,
            requestedSharePercent: null,
            proposalNotes: 'Private buyer estimate',
            status: 'submitted',
            submittedAt: null,
            saleEligibility: {
              saleMode: 'quickSale',
              acceptsCashProposals: false,
              acceptsInstallmentProposals: true,
              acceptsExchangeProposals: true,
              exchangePreferenceScope: 'selected',
              exchangeAssetTypes: ['factory', 'car'],
              configured: true,
            },
            components: [
              {
                componentType: 'exchangeAsset',
                proposedValue: 250000,
                assetType: 'car',
                assetDescription: null,
                installmentCount: null,
                installmentInterval: null,
              },
            ],
          }}
        />
      </main>
    );
  return (
    <main className="mx-auto grid max-w-1016 gap-24 p-16 tablet:grid-cols-2">
      <div className="min-w-0">
        <SaleTermsEditor ref={editor} listingId="2001" onDirty={() => setStatus('Unsaved')} />
        <Button
          className="mt-24"
          onClick={() =>
            void editor.current
              ?.save('2001')
              .then(() => setStatus('Saved'))
              .catch(() => setStatus('Error'))
          }
        >
          Save
        </Button>
        <p role="status" data-testid="save-status">
          {status}
        </p>
      </div>
      <FilterPanel
        filters={filters}
        onChange={setFilters}
        onClearAll={() => setFilters(defaultFilters)}
        source={{ all: () => [] }}
        surface="card"
      />
      <output className="min-w-0 wrap-anywhere tablet:col-span-2 type-body-caption" data-testid="query">
        {JSON.stringify({
          url: toSearchParams({ filters, page: 1, sort: 'newest' }),
          api: marketplaceStateToApiQuery({ filters, page: 1, sort: 'newest' }, 20),
        })}
      </output>
    </main>
  );
}
