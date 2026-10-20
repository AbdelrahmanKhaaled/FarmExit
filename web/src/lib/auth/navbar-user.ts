import type { NavbarUser } from '@/components/layout/Navbar';
import type { AuthUser } from './types';

export function toNavbarUser(user: AuthUser): NavbarUser {
  const name = user.fullName?.trim() || user.mobileE164;
  const parts = name.split(/\s+/);
  const firstName = parts[0] ?? name;
  const initials =
    parts.length >= 2
      ? `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
      : (name.slice(0, 2) || 'U').toUpperCase();
  return { firstName, initials };
}
