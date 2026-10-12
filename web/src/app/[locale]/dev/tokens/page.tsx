import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { devPreviewEnabled } from '@/lib/dev-preview';
import { tokenManifest as t } from '@/styles/token-manifest.generated';

/*
 * DEVELOPMENT-ONLY Token Preview. Not a product page.
 * Shows the FarmExit tokens generated from Figma so they can be compared with the Figma
 * Design System in English (LTR) and Arabic (RTL). Returns 404 in production builds.
 * Labels are token names and sample strings, not application copy.
 */

export const metadata: Metadata = {
  title: 'Token Preview (dev only) · FarmExit',
  robots: { index: false, follow: false },
};

const SAMPLE = {
  en: 'FarmExit — Reviewed farms across Egypt 0123456789',
  ar: 'FarmExit — مزرعة، فدان، شراكة، طلب إدارة مزرعة 0123456789',
} as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border-default pt-32">
      <h2 className="type-overline-section mb-24 text-text-accent">{title}</h2>
      {children}
    </section>
  );
}

export default async function TokenPreviewPage({ params }: PageProps<'/[locale]/dev/tokens'>) {
  if (!devPreviewEnabled) notFound();
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const other = locale === 'en' ? 'ar' : 'en';

  return (
    <main className="mx-auto flex max-w-content-max flex-col gap-48 px-r-page-margin py-64" data-testid="token-preview">
      <header className="flex flex-wrap items-end justify-between gap-16">
        <div>
          <p className="type-overline-card text-text-gold">Development only · not a product page</p>
          <h1 className="type-heading-h1-section mt-8 text-text-brand">Token Preview</h1>
          <p className="type-body-default mt-8 text-text-muted">
            locale <code>{locale}</code> · dir <code>{locale === 'ar' ? 'rtl' : 'ltr'}</code> · source{' '}
            <code>tokens/figma-variables.json</code>
          </p>
        </div>
        <Link
          href="/dev/tokens"
          locale={other}
          className="type-label-button rounded-full border border-border-strong bg-bg-surface px-20 py-12 text-text-brand"
        >
          {other === 'ar' ? 'العربية (RTL)' : 'English (LTR)'}
        </Link>
      </header>

      <Section title="Direction check (logical properties)">
        <div className="flex items-center gap-16 rounded-lg border border-border-default bg-bg-surface p-16">
          <span className="rounded-sm bg-brand-primary px-12 py-6 type-label-badge text-text-on-dark">start</span>
          <span className="type-body-small grow text-text-body">
            “start” sits on the left in English and on the right in Arabic.
          </span>
          <span className="rounded-sm bg-brand-gold px-12 py-6 type-label-badge text-brand-deep">end</span>
        </div>
      </Section>

      <Section title="Colors · semantic (Figma collection Color)">
        <ul className="grid grid-cols-2 gap-16 tablet:grid-cols-4 desktop:grid-cols-6">
          {t.colors.map((c) => (
            <li key={c.figma} className="overflow-hidden rounded-lg border border-border-default bg-bg-surface">
              <div
                className="h-56 border-b border-border-subtle"
                style={{
                  backgroundColor: `var(${c.cssVar})`,
                  backgroundImage:
                    'linear-gradient(45deg,#0000 75%,#0000000d 75%),linear-gradient(-45deg,#0000 75%,#0000000d 75%)',
                  backgroundSize: '12px 12px',
                }}
              />
              <div className="p-10">
                <p className="type-label-caption-strong break-all text-text-primary">{c.figma}</p>
                <p className="type-label-caption text-text-muted" dir="ltr">
                  {c.value}
                  {c.alias ? ` · ${c.alias}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Colors · primitives (Figma collection Primitives)">
        <ul className="grid grid-cols-3 gap-12 tablet:grid-cols-6 desktop:grid-cols-8">
          {t.primitives.map((c) => (
            <li key={c.figma}>
              <div
                className="h-40 rounded-md border border-border-hairline"
                style={{ backgroundColor: `var(${c.cssVar})` }}
              />
              <p className="type-label-caption-strong mt-6 text-text-primary">{c.figma}</p>
              <p className="type-label-caption text-text-muted" dir="ltr">
                {c.value}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Typography (Figma text styles → type-* utilities)">
        <ul className="flex flex-col gap-24">
          {t.text.map((s) => (
            <li key={s.figma} className="grid gap-8 desktop:grid-cols-[280px_1fr] desktop:gap-32">
              <div>
                <p className="type-label-small-strong text-text-primary">{s.figma}</p>
                <p className="type-label-caption text-text-muted">.{s.className}</p>
                <p className="type-label-caption text-text-subtle" dir="ltr">
                  {s.spec}
                </p>
              </div>
              <p className={`${s.className} min-w-0 break-words text-text-primary`}>
                {s.className === 'type-display-quote-mark' ? '“' : SAMPLE[locale]}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Language tokens (Figma collection Language) · active column follows <html lang>">
        <table className="type-body-table w-full border-collapse text-start">
          <thead>
            <tr className="type-overline-field text-text-muted">
              <th className="py-8 text-start">Token</th>
              <th className="py-8 text-start">English</th>
              <th className="py-8 text-start">Arabic</th>
            </tr>
          </thead>
          <tbody>
            {t.language.map((l) => (
              <tr key={l.figma} className="border-t border-border-subtle">
                <td className="py-8">{l.figma}</td>
                <td className="py-8" dir="ltr">
                  {String(l.en)}
                </td>
                <td className="py-8" dir="ltr">
                  {String(l.ar)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Spacing (Figma collection Spacing · 1 Tailwind unit = 1px)">
        <ul className="flex flex-col gap-8">
          {t.spacing.map((s) => (
            <li key={s.figma} className="flex items-center gap-16">
              <span className="type-label-meta w-96 shrink-0 text-text-muted">{s.figma}</span>
              <span
                className="block h-12 rounded-xs bg-brand-accent"
                style={{ inlineSize: `calc(var(--spacing) * ${s.value})` }}
              />
              <span className="type-label-caption text-text-subtle">{s.value}px</span>
            </li>
          ))}
        </ul>
        <ul className="type-label-caption mt-24 grid grid-cols-2 gap-8 text-text-body tablet:grid-cols-3">
          {t.layout.map((l) => (
            <li key={l.figma}>
              {l.figma}: {l.value}px
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Responsive values (Figma collection Responsive) · active value updates with the viewport">
        <table className="type-body-table w-full border-collapse">
          <thead>
            <tr className="type-overline-field text-text-muted">
              <th className="py-8 text-start">Token</th>
              <th className="py-8 text-start">Desktop 1440</th>
              <th className="py-8 text-start">Tablet 1024</th>
              <th className="py-8 text-start">Mobile 390</th>
              <th className="py-8 text-start">Active</th>
            </tr>
          </thead>
          <tbody>
            {t.responsive.map((r) => (
              <tr key={r.figma} className="border-t border-border-subtle">
                <td className="py-8">{r.figma}</td>
                <td className="py-8">{r.desktop}</td>
                <td className="py-8">{r.tablet}</td>
                <td className="py-8">{r.mobile}</td>
                <td className="py-8">
                  <span
                    className="block h-8 rounded-xs bg-brand-primary"
                    style={{ inlineSize: `min(100%, calc(var(${r.cssVar}) / 8))` }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Radius (Figma collection Radius)">
        <ul className="flex flex-wrap gap-24">
          {t.radius.map((r) => (
            <li key={r.figma} className="flex flex-col items-center gap-8">
              <span className={`${r.className} block size-80 border border-border-strong bg-bg-subtle`} />
              <span className="type-label-caption-strong text-text-primary">{r.figma}</span>
              <span className="type-label-caption text-text-muted">{r.value}px</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Effects (Figma effect styles → effect-* utilities)">
        <div
          className="grid grid-cols-1 gap-32 rounded-card p-32 tablet:grid-cols-3"
          style={{
            backgroundImage:
              'linear-gradient(135deg, var(--color-brand-deep), var(--color-brand-primary) 55%, var(--color-brand-accent-soft))',
          }}
        >
          {t.effects.map((e) => (
            <div
              key={e.figma}
              className={`${e.className} rounded-card p-24 ${e.hasBlur ? 'border border-overlay-glass-border bg-overlay-glass' : 'bg-bg-surface'}`}
            >
              <p className={`type-label-small-strong ${e.hasBlur ? 'text-text-on-dark' : 'text-text-primary'}`}>
                {e.figma}
              </p>
              <p className={`type-label-caption ${e.hasBlur ? 'text-overlay-on-dark-muted' : 'text-text-muted'}`}>
                .{e.className}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
