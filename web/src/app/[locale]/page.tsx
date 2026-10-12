import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { AboutSection } from '@/features/home/AboutSection';
import { CtaSection } from '@/features/home/CtaSection';
import { FeaturedFarms } from '@/features/home/FeaturedFarms';
import { HomeHero } from '@/features/home/HomeHero';
import { HowItWorks } from '@/features/home/HowItWorks';
import { JourneysSection } from '@/features/home/JourneysSection';
import { ManagementSection } from '@/features/home/ManagementSection';
import { MarketInsights } from '@/features/home/MarketInsights';
import { Testimonials } from '@/features/home/Testimonials';

/*
 * Homepage (Figma: Website Screens → Homepage / Desktop 1440 / EN, Tablet 1024 and Mobile 390 validation frames;
 * Arabic: 08 · Arabic Web → AR / 01 Public / Homepage). Section order is locked (Source of Truth §4);
 * the Evaluation section is hidden in the approved design (4p) and is not built.
 */
export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'home' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <>
      <Navbar />
      <main id="main" data-testid="locale-root">
        <HomeHero />
        <AboutSection />
        <JourneysSection />
        <FeaturedFarms />
        <ManagementSection />
        <HowItWorks />
        <MarketInsights />
        <Testimonials />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
