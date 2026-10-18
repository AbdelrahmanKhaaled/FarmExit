/**
 * Mobile drawer motion only — desktop must never use rtl:translate-x-full without max-md,
 * or the sidebar stays off-screen in Arabic (Tailwind cascade beats md:translate-x-0).
 */
export function sidebarMobileMotionClass(mobileOpen: boolean): string {
  if (mobileOpen) return 'max-md:translate-x-0';
  return 'max-md:-translate-x-full max-md:rtl:translate-x-full';
}
