import { useTranslations } from 'next-intl';
import { Container } from '@/components/layout/Container';
import { SectionHeader } from '@/components/layout/Section';
export function Testimonials({ records }: { records: { author: string; quote: string; authorized: boolean }[] }) {
  const t = useTranslations('home.testimonials');
  const approved = records.filter((r) => r.authorized === true);
  if (!approved.length) return null;
  return (
    <section className="pt-r-section-gap">
      <Container>
        <SectionHeader eyebrow={t('eyebrow')} titleId="testimonials-title" title={t('title')} />
        <ul className="mt-32 grid gap-24 tablet:grid-cols-3">
          {approved.map((r, i) => (
            <li key={i} className="rounded-card border border-border-default bg-bg-surface p-32">
              <blockquote>{r.quote}</blockquote>
              <p className="mt-24 type-label-large">{r.author}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
