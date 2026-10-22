import type { AdminNavGroup, AdminNavItem } from '@/config/admin-navigation';
import { adminNavigation } from '@/config/admin-navigation';
import type { StaffMe } from '@/lib/api/types/admin-dashboard';
import {
  StaffPermission,
  staffHasAnyPermission,
  staffHasPermission,
  staffHasStaffRole,
  staffIsAdminScope,
} from './staff-permissions';

/** Console path without locale prefix, e.g. `/admin/communications`. */
export function normalizeConsolePath(pathname: string): string {
  const stripped = pathname.replace(/^\/(en|ar)(?=\/)/, '');
  if (!stripped.startsWith('/admin')) return '/admin';
  const q = stripped.indexOf('?');
  return q === -1 ? stripped : stripped.slice(0, q);
}

export type ConsoleRouteKey =
  | 'overview'
  | 'analytics'
  | 'farms'
  | 'farmDetail'
  | 'listings'
  | 'listingDetail'
  | 'listingPipeline'
  | 'requests'
  | 'requestDetail'
  | 'proposals'
  | 'proposalDetail'
  | 'coPurchase'
  | 'coPurchaseDetail'
  | 'farmDetails'
  | 'farmDetailsDetail'
  | 'farmManagement'
  | 'farmManagementDetail'
  | 'partnerships'
  | 'partnershipDetail'
  | 'partnershipApplicationDetail'
  | 'verification'
  | 'verificationDetail'
  | 'evaluations'
  | 'evaluationDetail'
  | 'communications'
  | 'communicationDetail'
  | 'users'
  | 'userDetail'
  | 'administrators'
  | 'auditLogs';

type RouteRule = {
  adminOnly?: boolean;
  permission?: (typeof StaffPermission)[keyof typeof StaffPermission];
  anyPermission?: (typeof StaffPermission)[keyof typeof StaffPermission][];
  roles?: readonly string[];
};

const ROUTE_RULES: Record<ConsoleRouteKey, RouteRule> = {
  overview: { adminOnly: true },
  analytics: { adminOnly: true },
  farms: { adminOnly: true },
  farmDetail: { adminOnly: true },
  listings: { permission: StaffPermission.RequestsRead },
  listingDetail: { permission: StaffPermission.RequestsRead },
  listingPipeline: { adminOnly: true },
  requests: { permission: StaffPermission.RequestsRead },
  requestDetail: { permission: StaffPermission.RequestsRead },
  proposals: { permission: StaffPermission.RequestsRead, roles: ['admin', 'caseAgent'] },
  proposalDetail: { permission: StaffPermission.RequestsRead, roles: ['admin', 'caseAgent'] },
  coPurchase: { permission: StaffPermission.RequestsRead, roles: ['admin', 'caseAgent'] },
  coPurchaseDetail: { permission: StaffPermission.RequestsRead, roles: ['admin', 'caseAgent'] },
  farmDetails: { permission: StaffPermission.RequestsRead },
  farmDetailsDetail: { permission: StaffPermission.RequestsRead },
  farmManagement: { permission: StaffPermission.RequestsRead },
  farmManagementDetail: { permission: StaffPermission.RequestsRead },
  partnerships: { permission: StaffPermission.RequestsRead },
  partnershipDetail: { permission: StaffPermission.RequestsRead },
  partnershipApplicationDetail: { permission: StaffPermission.RequestsRead },
  verification: { permission: StaffPermission.RequestsRead },
  verificationDetail: { permission: StaffPermission.RequestsRead },
  evaluations: { permission: StaffPermission.EvaluationsManage },
  evaluationDetail: { permission: StaffPermission.EvaluationsManage },
  communications: { permission: StaffPermission.CommunicationRelay },
  communicationDetail: { permission: StaffPermission.CommunicationRelay },
  users: { adminOnly: true },
  userDetail: { adminOnly: true },
  administrators: { adminOnly: true },
  auditLogs: { adminOnly: true },
};

const NAV_ROUTE_KEY: Record<string, ConsoleRouteKey> = {
  dashboard: 'overview',
  analytics: 'analytics',
  farms: 'farms',
  listings: 'listings',
  listingPipeline: 'listingPipeline',
  requestsHub: 'requests',
  proposals: 'proposals',
  coPurchase: 'coPurchase',
  farmDetails: 'farmDetails',
  farmManagement: 'farmManagement',
  partnerships: 'partnerships',
  verification: 'verification',
  evaluations: 'evaluations',
  communications: 'communications',
  users: 'users',
  administrators: 'administrators',
  auditLogs: 'auditLogs',
};

export function canAccessConsoleRoute(staff: StaffMe, routeKey: ConsoleRouteKey): boolean {
  const rule = ROUTE_RULES[routeKey];
  if (rule.adminOnly) return staffIsAdminScope(staff.roles);
  if (rule.roles && !staffHasStaffRole(staff, rule.roles)) return false;
  if (rule.permission && !staffHasPermission(staff, rule.permission)) return false;
  if (rule.anyPermission && !staffHasAnyPermission(staff, rule.anyPermission)) return false;
  return true;
}

export function resolveConsoleRouteKey(pathname: string): ConsoleRouteKey | null {
  const path = normalizeConsolePath(pathname);
  if (path === '/admin' || path === '/admin/') return 'overview';
  if (path.startsWith('/admin/analytics')) return 'analytics';
  if (/^\/admin\/farms\/[^/]+$/.test(path)) return 'farmDetail';
  if (path.startsWith('/admin/farms')) return 'farms';
  if (/^\/admin\/listings\/[^/]+$/.test(path)) return 'listingDetail';
  if (path.startsWith('/admin/listing-pipeline')) return 'listingPipeline';
  if (path.startsWith('/admin/listings')) return 'listings';
  if (/^\/admin\/requests\/[^/]+$/.test(path)) return 'requestDetail';
  if (path.startsWith('/admin/requests')) return 'requests';
  if (/^\/admin\/proposals\/[^/]+$/.test(path)) return 'proposalDetail';
  if (path.startsWith('/admin/proposals')) return 'proposals';
  if (/^\/admin\/co-purchase\/[^/]+$/.test(path)) return 'coPurchaseDetail';
  if (path.startsWith('/admin/co-purchase')) return 'coPurchase';
  if (/^\/admin\/farm-details\/[^/]+$/.test(path)) return 'farmDetailsDetail';
  if (path.startsWith('/admin/farm-details')) return 'farmDetails';
  if (/^\/admin\/farm-management\/[^/]+$/.test(path)) return 'farmManagementDetail';
  if (path.startsWith('/admin/farm-management')) return 'farmManagement';
  if (/^\/admin\/partnerships\/applications\/[^/]+$/.test(path)) return 'partnershipApplicationDetail';
  if (/^\/admin\/partnerships\/[^/]+$/.test(path)) return 'partnershipDetail';
  if (path.startsWith('/admin/partnerships')) return 'partnerships';
  if (/^\/admin\/verification\/[^/]+$/.test(path)) return 'verificationDetail';
  if (path.startsWith('/admin/verification')) return 'verification';
  if (/^\/admin\/evaluations\/[^/]+\/[^/]+$/.test(path)) return 'evaluationDetail';
  if (path.startsWith('/admin/evaluations')) return 'evaluations';
  if (/^\/admin\/communications\/[^/]+$/.test(path)) return 'communicationDetail';
  if (path.startsWith('/admin/communications')) return 'communications';
  if (/^\/admin\/users\/[^/]+$/.test(path)) return 'userDetail';
  if (path.startsWith('/admin/users')) return 'users';
  if (path.startsWith('/admin/administrators')) return 'administrators';
  if (path.startsWith('/admin/audit-logs')) return 'auditLogs';
  return null;
}

export function canAccessConsolePath(staff: StaffMe, pathname: string): boolean {
  const key = resolveConsoleRouteKey(pathname);
  if (!key) return staffIsAdminScope(staff.roles);
  return canAccessConsoleRoute(staff, key);
}

export function getStaffHomePath(staff: StaffMe): '/admin' | '/admin/communications' | '/admin/requests' {
  if (staffIsAdminScope(staff.roles)) return '/admin';
  if (staffHasPermission(staff, StaffPermission.CommunicationRelay)) return '/admin/communications';
  if (staffHasPermission(staff, StaffPermission.RequestsRead)) return '/admin/requests';
  return '/admin/requests';
}

export function filterAdminNavigation(staff: StaffMe): AdminNavGroup[] {
  return adminNavigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.enabled) return false;
        const routeKey = NAV_ROUTE_KEY[item.key];
        if (!routeKey) return false;
        return canAccessConsoleRoute(staff, routeKey);
      }),
    }))
    .filter((group) => group.items.length > 0);
}

export function canSeeNavItem(staff: StaffMe, item: AdminNavItem): boolean {
  if (!item.enabled) return false;
  const routeKey = NAV_ROUTE_KEY[item.key];
  if (!routeKey) return false;
  return canAccessConsoleRoute(staff, routeKey);
}
