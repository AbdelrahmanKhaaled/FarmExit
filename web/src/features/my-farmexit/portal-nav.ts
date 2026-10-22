export const PORTAL_PHASE = 9;

/** Primary My FarmExit navigation (Figma-aligned). Legacy workflow routes stay reachable via deep links. */
export const portalNav = [
  { key: 'overview', href: '/my', phase: 5 },
  { key: 'farms', href: '/my/farms', phase: 5 },
  { key: 'requests', href: '/my/requests', phase: 5 },
  { key: 'applications', href: '/my/applications', phase: 8 },
  { key: 'saved', href: '/my/saved', phase: 5 },
  { key: 'messages', href: '/my/messages', phase: 9 },
  { key: 'documents', href: '/my/documents', phase: 5 },
  { key: 'notifications', href: '/my/notifications', phase: 5 },
  { key: 'profile', href: '/my/profile', phase: 5 },
] as const;

/** Routes consolidated under My Requests in the sidebar highlight state. */
export const requestWorkspacePrefixes = [
  '/my/management',
  '/my/partnerships',
  '/my/proposals',
  '/my/professional/verification',
  '/my/farm-details-requests',
] as const;

export const mobileBottomNav = [
  { key: 'overview', href: '/my', phase: 5 },
  { key: 'requests', href: '/my/requests', phase: 5 },
  { key: 'farms', href: '/my/farms', phase: 5 },
  { key: 'messages', href: '/my/messages', phase: 9 },
  { key: 'profile', href: '/my/profile', phase: 5 },
] as const;

export function isPortalNavActive(pathname: string, href: string, key: string): boolean {
  if (key === 'requests') {
    if (pathname === '/my/requests' || pathname.startsWith('/my/requests/')) return true;
    return requestWorkspacePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }
  if (key === 'applications') {
    return pathname === '/my/applications' || pathname.startsWith('/my/applications/');
  }
  if (key === 'farms') {
    return pathname === '/my/farms' || pathname.startsWith('/my/farms/');
  }
  if (key === 'messages') {
    return pathname === '/my/messages' || pathname.startsWith('/my/messages/');
  }
  if (key === 'professional') {
    return pathname === '/my/professional' || pathname.startsWith('/my/professional/');
  }
  return pathname === href || (href !== '/my' && pathname.startsWith(href));
}
