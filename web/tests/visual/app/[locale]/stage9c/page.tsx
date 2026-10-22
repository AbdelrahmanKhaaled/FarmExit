import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { MessageFarmExitPanel } from '@/features/my-messages/MessageFarmExitPanel';

export default async function Stage9cFixture({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.FARMEXIT_VISUAL_TEST !== '1') notFound();
  const { locale } = await params;
  if (locale !== 'en' && locale !== 'ar') notFound();
  setRequestLocale(locale);
  return (
    <div className="mx-auto max-w-480 p-24">
      <MessageFarmExitPanel requestId="9001" requestStatus="underFarmExitReview" />
    </div>
  );
}
