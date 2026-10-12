'use client';

import { useSyncExternalStore } from 'react';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/icons/Icon';
import { RESULTS_QUERY_KEY } from '@/features/marketplace/url-state';

/*
 * Figma: Farm Details › Breadcrumb Row › Back ("Back to results", Label/Small Strong, brand, arrow 18).
 * Returns to the Marketplace with the visitor's last filters and sort (remembered for the session by the
 * Marketplace); opened directly, it links to the default results. The browser Back button restores them too.
 */
const noop = () => () => {};

function readQuery() {
  try {
    return window.sessionStorage.getItem(RESULTS_QUERY_KEY) ?? '';
  } catch {
    return '';
  }
}

export function BackToResults({ label }: { label: string }) {
  const query = useSyncExternalStore(noop, readQuery, () => '');

  return (
    <Link
      href={query ? `/farms?${query}` : '/farms'}
      className="inline-flex items-center gap-8 type-label-small-strong text-text-brand transition-colors duration-150 hover:text-brand-primary-hover"
    >
      <Icon name="arrow-left" size={18} />
      {label}
    </Link>
  );
}
