/** Dashboard console routes that require an admin session (not login/forbidden). */
export function isAdminConsoleDocumentPath(pathname: string): boolean {
  if (!pathname.includes('/admin')) return false;
  if (pathname.includes('/admin/login')) return false;
  if (pathname.includes('/admin/forbidden')) return false;
  if (pathname.startsWith('/api/')) return false;
  return /\/(en|ar)\/admin(\/|$)/.test(pathname) || pathname === '/admin' || /^\/admin\/?$/.test(pathname);
}
