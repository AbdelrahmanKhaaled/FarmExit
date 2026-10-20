'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/Field';
import { sanitizeReturnTo } from '@/lib/auth/return-to';
import { Icon } from '@/components/icons/Icon';

type Props = {
  returnTo?: string;
  locale: string;
  initialEmail?: string | null;
  mobile?: string;
};

export function ProfileForm({ returnTo, locale, initialEmail, mobile }: Props) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (fullName.trim().length < 2) {
      setError(t('errors.nameRequired'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/profile/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim() || undefined }),
      });
      if (!res.ok) {
        setError(t('errors.profileFailed'));
        return;
      }
      router.replace(sanitizeReturnTo(returnTo, locale));
      router.refresh();
    } catch {
      setError(t('errors.profileFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-24"
      aria-busy={loading}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <TextInput
        fieldStyle="form"
        label={t('profile.fullName')}
        helper={t('visual.nameHint')}
        autoComplete="name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        error={error ?? undefined}
        disabled={loading}
      />
      {mobile && (
        <div className="flex flex-col gap-8">
          <p className="type-label-small-strong text-text-secondary">{t('mobile.label')}</p>
          <div className="flex flex-wrap items-center justify-between gap-8 rounded-lg border border-border-subtle bg-bg-muted p-16">
            <bdi className="type-label-large">{mobile}</bdi>
            <span className="inline-flex items-center gap-6 rounded-full bg-bg-success-soft px-12 py-6 type-label-small-strong text-text-brand">
              <Icon name="tick" size={16} />
              {t('visual.verified')}
            </span>
          </div>
          <p className="type-label-caption text-text-muted">{t('visual.verifiedHint')}</p>
        </div>
      )}
      <TextInput
        fieldStyle="form"
        label={t('profile.emailOptional')}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      <p className="flex items-start gap-12 rounded-lg bg-bg-muted p-16 type-body-default text-text-secondary">
        <Icon name="verify-filled" size={24} className="shrink-0 text-brand-gold" />
        {t('visual.oneAccount')}
      </p>
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
        {loading ? t('visual.saving') : t('profile.submit')}
      </Button>
    </form>
  );
}
