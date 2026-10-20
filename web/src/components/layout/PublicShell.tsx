import type { ReactNode } from 'react';
import { Footer } from './Footer';
import { Navbar, type NavbarUser } from './Navbar';

export function PublicShell({
  children,
  user,
}: {
  children: ReactNode;
  user?: NavbarUser;
}) {
  return (
    <>
      <Navbar user={user} />
      {children}
      <Footer />
    </>
  );
}
