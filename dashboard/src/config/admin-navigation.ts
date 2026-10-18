export type AdminNavItem = {
  key: string;
  href: string;
  enabled: boolean;
};

export type AdminNavGroup = {
  key: string;
  items: AdminNavItem[];
};

export const adminNavigation: AdminNavGroup[] = [
  {
    key: 'overview',
    items: [
      { key: 'dashboard', href: '/admin', enabled: true },
      { key: 'analytics', href: '/admin/analytics', enabled: true },
    ],
  },
  {
    key: 'farmOps',
    items: [
      { key: 'farms', href: '/admin/farms', enabled: true },
      { key: 'listings', href: '/admin/listings', enabled: true },
      { key: 'listingPipeline', href: '/admin/listing-pipeline', enabled: true },
    ],
  },
  {
    key: 'requests',
    items: [
      { key: 'requestsHub', href: '/admin/requests', enabled: true },
      { key: 'proposals', href: '/admin/proposals', enabled: true },
      { key: 'coPurchase', href: '/admin/co-purchase', enabled: true },
      { key: 'farmDetails', href: '/admin/farm-details', enabled: true },
    ],
  },
  {
    key: 'business',
    items: [
      { key: 'farmManagement', href: '/admin/farm-management', enabled: true },
      { key: 'partnerships', href: '/admin/partnerships', enabled: true },
      { key: 'verification', href: '/admin/verification', enabled: true },
      { key: 'evaluations', href: '/admin/evaluations', enabled: true },
      { key: 'communications', href: '/admin/communications', enabled: true },
    ],
  },
  {
    key: 'platform',
    items: [
      { key: 'users', href: '/admin/users', enabled: true },
      { key: 'administrators', href: '/admin/administrators', enabled: true },
      { key: 'auditLogs', href: '/admin/audit-logs', enabled: true },
      { key: 'settings', href: '/admin/settings', enabled: false },
    ],
  },
];
