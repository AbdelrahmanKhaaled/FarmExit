'use client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

function FilterHelp({ id, text }: { id: string; text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={text}
        aria-describedby={id}
        className="rounded-full px-1 text-[var(--admin-text-muted)] focus-visible:outline-2"
      >
        ⓘ
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute start-0 top-full z-20 hidden w-64 rounded-lg border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] p-3 text-xs font-normal shadow-lg group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  );
}

export function FarmFilters({
  search,
  governorate,
  farmStatus,
  listingPublication,
  options,
}: {
  search: string;
  governorate: string;
  farmStatus: string;
  listingPublication: string;
  options: { governorates: string[]; statuses: string[] };
}) {
  const t = useTranslations('admin.farms'),
    b = useTranslations('batch');
  return (
    <form
      method="get"
      className="operation-card farm-filter-grid mb-5"
      onSubmit={(e) => {
        const input = e.currentTarget.elements.namedItem('governorate') as HTMLInputElement;
        if (input.value && !options.governorates.includes(input.value)) {
          input.setCustomValidity(b('allGovernorates'));
          input.reportValidity();
          e.preventDefault();
        }
      }}
    >
      <label>
        {t('search')}
        <input name="search" defaultValue={search} className="admin-form-control" />
      </label>
      <label>
        {b('governorate')}
        <input
          name="governorate"
          list="farm-governorates"
          defaultValue={governorate}
          placeholder={b('allGovernorates')}
          className="admin-form-control"
          onChange={(e) => e.target.setCustomValidity('')}
        />
        <datalist id="farm-governorates">
          {options.governorates.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </label>
      <div className="min-w-40 flex-1 space-y-1.5 text-[0.7rem]">
        <div className="flex items-center gap-1">
          <label className="farm-filter-caption" htmlFor="farm-status">
            {b('farmStatusLabel')}
          </label>
          <FilterHelp id="farm-status-help" text={b('farmStatusHelp')} />
        </div>
        <select
          id="farm-status"
          name="farmStatus"
          aria-label={b('farmStatusLabel')}
          defaultValue={farmStatus}
          className="admin-form-control"
        >
          <option value="">{b('allStatuses')}</option>
          {options.statuses.map((v) => (
            <option key={v} value={v}>
              {b.has(v) ? b(v) : v}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-48 flex-1 space-y-1.5 text-[0.7rem]">
        <div className="flex items-center gap-1">
          <label className="farm-filter-caption" htmlFor="listing-publication">
            {b('publication')}
          </label>
          <FilterHelp id="listing-publication-help" text={b('publicationHelp')} />
        </div>
        <select
          id="listing-publication"
          name="listingPublication"
          aria-label={b('publication')}
          defaultValue={listingPublication}
          className="admin-form-control"
        >
          <option value="">{b('allFarms')}</option>
          <option value="sale">{b('publishedForSale')}</option>
          <option value="rent">{b('publishedForRent')}</option>
          <option value="none">{b('noPublished')}</option>
          <option value="saleAndRent">{b('publishedSaleAndRent')}</option>
        </select>
      </div>
      <button type="submit" className="admin-btn-primary">
        {t('applyFilters')}
      </button>
      <Link href="/admin/farms" className="admin-btn-secondary">
        {b('clear')}
      </Link>
    </form>
  );
}
