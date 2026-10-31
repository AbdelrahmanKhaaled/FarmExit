'use client';
import { useState } from 'react';
import { useLocale } from 'next-intl';
import type { LocalizedContent } from '@/lib/content/localized';
export function BilingualFields({
  value,
  onChange,
  fields,
  legacy = {},
}: {
  value: LocalizedContent;
  onChange: (next: LocalizedContent) => void;
  fields: { key: string; label: string; maxLength?: number }[];
  legacy?: Record<string, string>;
}) {
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const ar = useLocale() === 'ar';
  return (
    <section
      className="rounded-xl border border-border-hairline bg-bg-surface p-16"
      aria-label={ar ? 'محتوى المزرعة باللغتين' : 'Bilingual farm content'}
    >
      <div role="group" className="mb-16 flex gap-8" aria-label={ar ? 'لغة المحتوى' : 'Content language'}>
        {(['en', 'ar'] as const).map((lang) => (
          <button
            type="button"
            key={lang}
            aria-pressed={language === lang}
            onClick={() => setLanguage(lang)}
            className={
              'rounded-lg border px-16 py-10 ' + (language === lang ? 'bg-brand-primary text-white' : 'text-text-brand')
            }
          >
            {lang === 'en' ? 'English' : 'العربية'}{' '}
            <span>
              {fields.filter((f) => value[lang]?.[f.key]?.trim()).length}/{fields.length}
            </span>
          </button>
        ))}
      </div>
      <p className="mb-12 type-body-caption text-text-muted">
        {ar
          ? 'يمكن حفظ المسودة قبل اكتمال الترجمة. النص الأصلي محفوظ دون ترجمة تلقائية.'
          : 'Drafts may have missing translations. Original content is preserved; nothing is auto-translated.'}
      </p>
      <div className="grid gap-16">
        {fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-8 type-label-medium">
            {f.label} · {language === 'en' ? 'English' : 'العربية'}
            <textarea
              dir={language === 'ar' ? 'rtl' : 'ltr'}
              lang={language}
              rows={f.key.toLowerCase().includes('description') ? 3 : 1}
              maxLength={f.maxLength ?? 5000}
              className="w-full rounded-xl border border-border-default p-12"
              value={value[language]?.[f.key] ?? ''}
              placeholder={language === 'en' ? (legacy[f.key] ?? '') : ''}
              onChange={(e) => onChange({ ...value, [language]: { ...value[language], [f.key]: e.target.value } })}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
