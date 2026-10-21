import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Stage1eFixture } from './fixture';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ screen?: string }>;
}) {
  if (process.env.FARMEXIT_VISUAL_TEST !== '1') notFound();
  const { locale } = await params;
  if (locale !== 'en' && locale !== 'ar') notFound();
  setRequestLocale(locale);
  const query = await searchParams;
  return <Stage1eFixture screen={query.screen} />;
}
