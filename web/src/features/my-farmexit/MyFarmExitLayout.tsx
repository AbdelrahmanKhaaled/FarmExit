import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { Container } from '@/components/layout/Container';
import { toNavbarUser } from '@/lib/auth/navbar-user';
import type { WebsiteSession } from '@/lib/auth/session.server';
import { PortalNavigation } from './PortalNavigation';
import { LogoutButton } from './LogoutButton';
import { Avatar } from '@/components/ui/Avatar';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/icons/Icon';
import './portal.css';
import { WizardLayoutGate } from '@/features/my-farms/WizardLayoutGate';

type Props = {
  session: WebsiteSession;
  children: ReactNode;
  title?: string;
};

export async function MyFarmExitLayout({ session, children, title }: Props) {
  const t = await getTranslations('workspace');
  const navUser = toNavbarUser(session.user);

  return (
    <WizardLayoutGate wizard={children}>
      <div className="pb-[calc(96px+env(safe-area-inset-bottom))] tablet:pb-0">
        <Navbar user={navUser} />
        <main className="min-h-[calc(100dvh-78px)] bg-bg-page py-24 tablet:py-40" data-testid="my-farmexit">
          <h1 className="sr-only">{title ?? t('title')}</h1>
          <Container size="app" className="grid items-stretch gap-24 desktop:grid-cols-[310px_minmax(0,1fr)]">
            <aside className="flex min-w-0 flex-col gap-16 desktop:rounded-card desktop:border desktop:border-border-hairline desktop:bg-bg-surface desktop:p-16 desktop:effect-premium-rest">
              <div className="flex flex-wrap items-center gap-12 desktop:block">
                <div className="hidden items-center gap-12 px-8 py-8 tablet:flex">
                  <Avatar initials={navUser.initials} size="md" />
                  <div className="min-w-0">
                    <p className="type-label-small-strong wrap-anywhere text-text-primary">
                      {session.user.fullName ?? session.user.mobileE164}
                    </p>
                    <p className="type-label-caption text-text-muted">{t('visual.account')}</p>
                  </div>
                </div>
                <Link
                  href="/my/professional"
                  className="hidden w-fit items-center gap-6 rounded-full border border-dashed border-border-strong px-12 py-6 type-label-caption text-text-secondary tablet:flex desktop:mt-12"
                >
                  <Icon name="add" size={14} />
                  {t('visual.capabilities')}
                </Link>
                <details className="w-full rounded-lg border border-border-subtle bg-bg-surface p-12 tablet:ms-auto tablet:w-auto desktop:hidden">
                  <summary className="cursor-pointer type-label-small-strong text-text-brand">
                    {t('visual.more')}
                  </summary>
                  <div className="pt-12">
                    <PortalNavigation />
                    <Link href="/my/professional" className="my-12 block type-label-caption text-text-brand">
                      {t('visual.capabilities')}
                    </Link>
                    <Link href="/my/messages" className="my-12 block type-label-caption text-text-brand">
                      {t('visual.help')}
                    </Link>
                    <LogoutButton />
                  </div>
                </details>
              </div>
              <div className="hidden rounded-lg border border-border-subtle bg-bg-surface p-4 tablet:block desktop:rounded-none desktop:border-x-0 desktop:border-b-0 desktop:bg-transparent desktop:p-0 desktop:pt-12">
                <PortalNavigation />
              </div>
              <div className="hidden desktop:block">
                <Link
                  href="/my/messages"
                  className="flex min-h-44 items-center gap-8 rounded-lg bg-bg-muted p-12 type-label-caption-strong text-text-brand"
                >
                  <Icon name="messages" size={18} />
                  {t('visual.help')}
                </Link>
                <LogoutButton />
              </div>
            </aside>
            <div className="fx-workspace min-w-0">{children}</div>
          </Container>
        </main>
        <Footer />
        <PortalNavigation bottom />
      </div>
    </WizardLayoutGate>
  );
}
