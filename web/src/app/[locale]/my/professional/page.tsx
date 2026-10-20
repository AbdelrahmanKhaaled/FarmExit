import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { getApiBaseUrl } from '@/lib/api/config';
import { ProfessionalHub, type ProfessionalProfile } from '@/features/my-professional/ProfessionalHub';
import { Card } from '@/components/ui/Surface';

export const instant = false;

export default async function MyProfessionalPage({ params, searchParams }: PageProps<'/[locale]/my/professional'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireCompletedProfile(locale, `/${locale}/my/professional`);
  const query = await searchParams;
  const requestedStep = Number(query.step);
  const initialStep = [1, 2, 3].includes(requestedStep) ? requestedStep : undefined;
  let profile: ProfessionalProfile | null = null;
  const res = await fetch(`${getApiBaseUrl()}/professional-profile`, {
    headers: { authorization: `Bearer ${session.accessToken}`, accept: 'application/json' },
    cache: 'no-store',
  });
  if (res.ok) profile = (await res.json()) as ProfessionalProfile;
  else if (res.status !== 404) {
    const t = await getTranslations('workspace.phase7');
    return (
      <Card>
        <p role="alert">{t('profileUnavailable')}</p>
      </Card>
    );
  }

  return <ProfessionalHub initial={profile} name={session.user.fullName} initialStep={initialStep} />;
}
