import { Navbar } from './Navbar';
import { toNavbarUser } from '@/lib/auth/navbar-user';
import { getWebsiteSession } from '@/lib/auth/session.server';

/** Public routes: hydrate navbar from HttpOnly session on the server (no guest flash). */
export async function PublicNavbar() {
  const session = await getWebsiteSession();
  return (
    <Navbar
      user={session ? toNavbarUser(session.user) : undefined}
      sessionResolved={!session}
    />
  );
}
