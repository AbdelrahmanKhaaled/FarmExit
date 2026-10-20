import type { ReactNode } from 'react';
import { Footer } from './Footer';
import { Navbar, type NavbarUser } from './Navbar';
import { PublicNavbar } from './PublicNavbar';

export function PublicShell({ children, user }: { children: ReactNode; user?: NavbarUser }) {
  return (
    <>
      {user ? <Navbar user={user} /> : <PublicNavbar />}
      {children}
      <Footer />
    </>
  );
}
