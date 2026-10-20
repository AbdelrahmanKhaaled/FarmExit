import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { AddFarmForm } from '@/features/my-farms/AddFarmForm';

export const instant = false;

export default async function NewFarmPage({ params }: PageProps<'/[locale]/my/farms/new'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireCompletedProfile(locale, `/${locale}/my/farms/new`);
  return <AddFarmForm user={session.user} />;
}
