export const PORTAL_PHASE = 9;

export const portalNav = [
  { key: 'overview', href: '/my', phase: 5 },
  { key: 'farms', href: '/my/farms', phase: 5 },
  { key: 'management', href: '/my/management', phase: 7 },
  { key: 'professional', href: '/my/professional', phase: 7 },
  { key: 'partnerships', href: '/my/partnerships', phase: 8 },
  { key: 'proposals', href: '/my/proposals', phase: 8 },
  { key: 'requests', href: '/my/requests', phase: 5 },
  { key: 'applications', href: '/my/applications', phase: 8 },
  { key: 'saved', href: '/my/saved', phase: 5 },
  { key: 'messages', href: '/my/messages', phase: 9 },
  { key: 'documents', href: '/my/documents', phase: 5 },
  { key: 'notifications', href: '/my/notifications', phase: 5 },
  { key: 'profile', href: '/my/profile', phase: 5 },
] as const;
