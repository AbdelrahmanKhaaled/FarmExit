'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { loginErrorKey } from '@/lib/admin/login-errors';
import { cn } from '@/lib/cn';

type ApiErrorBody = {
  message?: string;
  retryAfterSeconds?: number;
  code?: string;
};

export function AdminLoginForm() {
  const t = useTranslations('admin.login');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError(t('errors.invalidEmail'));
      return;
    }
    if (!password) {
      setError(t('errors.passwordRequired'));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });
      const data = (await res.json().catch(() => ({}))) as ApiErrorBody;
      if (!res.ok) {
        const key = loginErrorKey(res.status, data);
        if (key === 'rateLimited') {
          setError(
            data.retryAfterSeconds
              ? t('errors.rateLimited', { seconds: data.retryAfterSeconds })
              : t('errors.rateLimitedGeneric'),
          );
          return;
        }
        setError(t(`errors.${key}`));
        return;
      }
      router.replace('/admin');
      router.refresh();
    } catch {
      setError(t('errors.network'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        signIn();
      }}
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="admin-login-email" className="text-sm font-medium text-[var(--admin-text-primary)]">
          {t('emailLabel')}
        </label>
        <input
          id="admin-login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          aria-label={t('emailLabel')}
          className={cn(
            'rounded-[var(--admin-radius-md)] border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)]',
            'px-4 py-3 text-base outline-none transition-shadow',
            'focus:border-[var(--admin-brand-secondary)] focus:ring-2 focus:ring-[var(--admin-focus-ring)]/25',
          )}
          placeholder={t('emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="admin-login-password" className="text-sm font-medium text-[var(--admin-text-primary)]">
          {t('passwordLabel')}
        </label>
        <div className="relative">
          <input
            id="admin-login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            dir="ltr"
            aria-label={t('passwordLabel')}
            className={cn(
              'w-full rounded-[var(--admin-radius-md)] border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)]',
              'px-4 py-3 pe-12 text-base outline-none transition-shadow',
              'focus:border-[var(--admin-brand-secondary)] focus:ring-2 focus:ring-[var(--admin-focus-ring)]/25',
            )}
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
          <button
            type="button"
            className="absolute inset-y-0 end-2 px-2 text-xs font-medium text-[var(--admin-text-muted)] hover:text-[var(--admin-brand-primary)]"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? t('hidePassword') : t('showPassword')}
          >
            {showPassword ? t('hidePassword') : t('showPassword')}
          </button>
        </div>
      </div>
      {error && (
        <p
          className="rounded-[var(--admin-radius-sm)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !email.trim() || !password}
        className={cn(
          'rounded-[var(--admin-radius-md)] bg-[var(--admin-brand-primary)] px-4 py-3 text-sm font-semibold text-white',
          'transition-colors hover:bg-[var(--admin-brand-secondary)] disabled:opacity-50',
        )}
      >
        {busy ? t('signingIn') : t('signIn')}
      </button>
    </form>
  );
}
