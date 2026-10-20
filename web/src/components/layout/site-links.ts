import type { ComponentProps } from 'react';
import type { Link } from '@/i18n/navigation';

type Href = ComponentProps<typeof Link>['href'];

/*
 * Destinations used by the shared Navbar and Footer, in one place. Locale-free paths: next-intl adds the
 * /en or /ar prefix. The pages themselves are built from Phase 2 on; update a path here when its page lands.
 * Labels live in messages/<locale>/nav.json under the same keys.
 */
export const primaryNav = [
  { key: 'farms', href: '/farms' },
  { key: 'management', href: '/management' },
  { key: 'partnerships', href: '/partnerships' },
  { key: 'howItWorks', href: { pathname: '/', hash: 'how-it-works' } },
  { key: 'marketInsights', href: { pathname: '/', hash: 'market-insights' } },
] as const satisfies ReadonlyArray<{ key: string; href: Href }>;

export const accountLinks = {
  signIn: '/sign-in',
  listYourFarm: '/my/farms/new',
  myFarmExit: '/my',
  notifications: '/my/notifications',
} as const satisfies Record<string, Href>;

export const footerColumns = [
  {
    key: 'farms',
    links: [
      { key: 'buyFarms', href: { pathname: '/farms', query: { listing: 'sale' } } },
      { key: 'rentFarms', href: { pathname: '/farms', query: { listing: 'rent' } } },
      { key: 'marketInsights', href: { pathname: '/', hash: 'market-insights' } },
    ],
  },
  {
    key: 'management',
    links: [
      { key: 'requestManager', href: '/my/management/new' },
      { key: 'openRequests', href: '/management' },
      { key: 'joinAsManager', href: '/my/professional' },
      { key: 'ownerPortal', href: '/my' },
    ],
  },
  {
    key: 'company',
    links: [
      { key: 'about', href: '/about' },
      { key: 'careers', href: '/careers' },
      { key: 'contact', href: '/contact' },
      { key: 'terms', href: '/terms' },
    ],
  },
] as const satisfies ReadonlyArray<{ key: string; links: ReadonlyArray<{ key: string; href: Href }> }>;
