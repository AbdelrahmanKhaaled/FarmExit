import { useTranslations } from 'next-intl';
import type { AuthUser } from '@/lib/auth/types';
import { Surface } from '@/components/ui/Surface';
import { PortalHeading } from './PortalUI';
import { Avatar } from '@/components/ui/Avatar';
import { toNavbarUser } from '@/lib/auth/navbar-user';
import { ButtonLink } from '@/components/ui/Button';
export function ProfileContent({ user }: { user: AuthUser }) {
  const t = useTranslations('workspace');
  return (
    <div className="flex flex-col gap-24">
      <PortalHeading title={t('profile.title')} description={t('visual.profileIntro')} />
      <Surface className="flex flex-col gap-24 p-24 tablet:p-32">
        <h3 className="type-label-large text-text-primary">{t('visual.basic')}</h3>
        <Avatar initials={toNavbarUser(user).initials} size="lg" />
        <dl className="grid gap-24 tablet:grid-cols-2">
          <div>
            <dt className="type-label-caption text-text-muted">{t('profile.fullName')}</dt>
            <dd className="mt-8 rounded-lg border border-border-strong bg-bg-muted p-16 type-label-large">
              {user.fullName}
            </dd>
          </div>
          <div>
            <dt className="type-label-caption text-text-muted">{t('profile.mobile')}</dt>
            <dd className="mt-8 rounded-lg border border-border-strong bg-bg-muted p-16 type-label-large" dir="ltr">
              {user.mobileE164}
            </dd>
          </div>
          <div>
            <dt className="type-label-caption text-text-muted">{t('profile.email')}</dt>
            <dd className="mt-8 rounded-lg border border-border-strong bg-bg-muted p-16 type-label-large wrap-anywhere">
              {user.email ?? t('profile.noEmail')}
            </dd>
          </div>
        </dl>
        <p className="type-body-small text-text-muted">{t('profile.editNote')}</p>
      </Surface>
      <Surface className="flex flex-wrap items-center justify-between gap-16 p-24">
        <div>
          <h3 className="type-heading-h4">{t('professional.title')}</h3>
          <p className="mt-8 max-w-560 type-body-default text-text-muted">{t('visual.noRoles')}</p>
        </div>
        <ButtonLink href="/my/professional" variant="outline">
          {t('visual.viewProfessional')}
        </ButtonLink>
      </Surface>
    </div>
  );
}
