'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/icons/Icon';
import { normalizeMobile } from '@/lib/auth/phone';
import { sanitizeReturnTo } from '@/lib/auth/return-to';
import { intentStore } from '@/lib/intent/store';
import { MobileInput } from './MobileInput';
import { isClientDemoHintMobile } from '@/lib/auth/client-demo-hint';
import { OtpInput } from './OtpInput';

type Step = 'mobile' | 'otp';

type Props = {
  returnTo?: string;
  farmName?: string;
};

export function SignInForm({ returnTo, farmName }: Props) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<Step>('mobile');
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendAfter, setResendAfter] = useState(0);

  useEffect(() => {
    if (resendAfter <= 0) return;
    const id = window.setInterval(() => setResendAfter((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [resendAfter]);

  const e164 = normalizeMobile(mobile);

  const requestOtp = useCallback(async () => {
    setError(null);
    if (!e164) {
      setError(t('errors.invalidMobile'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mobile: e164 }),
      });
      const data = (await res.json()) as { resendAfterSeconds?: number; message?: string; retryAfterSeconds?: number };
      if (!res.ok) {
        const wait = data.retryAfterSeconds ?? data.resendAfterSeconds;
        if (wait) setResendAfter(wait);
        setError(t('errors.requestFailed'));
        return;
      }
      setResendAfter(data.resendAfterSeconds ?? 60);
      setStep('otp');
    } catch {
      setError(t('errors.requestFailed'));
    } finally {
      setLoading(false);
    }
  }, [e164, t]);

  const verify = useCallback(async () => {
    setError(null);
    if (!e164 || code.length !== 6) {
      setError(t('errors.invalidOtp'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mobile: e164, code }),
      });
      const data = (await res.json()) as { user?: { profileCompleted: boolean }; message?: string };
      if (!res.ok) {
        setError(t('errors.verifyFailed'));
        return;
      }
      const target = sanitizeReturnTo(returnTo, locale);
      if (!data.user?.profileCompleted) {
        router.replace(`/${locale}/auth/complete-profile?returnTo=${encodeURIComponent(target)}`);
        return;
      }
      const intent = intentStore.consume();
      if (intent?.action === 'saveItem' && intent.targetId) {
        await fetch(`/api/marketplace/saved/${intent.targetId}`, { method: 'POST' });
      }
      router.replace(intent?.returnTo ? sanitizeReturnTo(intent.returnTo, locale) : target);
      router.refresh();
    } catch {
      setError(t('errors.verifyFailed'));
    } finally {
      setLoading(false);
    }
  }, [code, e164, locale, returnTo, router, t]);

  return (
    <div className="flex w-full flex-col gap-24" data-testid="sign-in-form">
      {farmName && (
        <div className="flex items-center gap-12 rounded-lg bg-bg-muted p-12">
          <Icon name="tree" size={28} className="shrink-0 text-text-brand" />
          <div className="min-w-0">
            <p className="type-overline-field text-text-gold">{t('visual.farmContext')}</p>
            <p className="type-label-small-strong text-text-primary">{farmName}</p>
          </div>
        </div>
      )}
      {step === 'otp' && (
        <button
          type="button"
          onClick={() => {
            setStep('mobile');
            setError(null);
          }}
          className="flex size-44 items-center justify-center rounded-full bg-bg-muted text-text-secondary"
          aria-label={t('otp.changeNumber')}
        >
          <Icon name="arrow-left" size={20} />
        </button>
      )}
      <div className="flex flex-col gap-10">
        <h1 className="type-heading-h3 text-text-primary">
          {step === 'mobile' ? t('signIn.title') : t('visual.otpTitle')}
        </h1>
        <div className="type-body-default text-text-muted">
          {step === 'mobile' ? (
            t('signIn.subtitle')
          ) : (
            <>
              <bdi>{t('otp.sentTo', { mobile: e164 ?? mobile })}</bdi>
              <span aria-hidden="true"> · </span>
              <button
                type="button"
                className="type-label-small-strong text-text-brand"
                onClick={() => {
                  setStep('mobile');
                  setError(null);
                }}
              >
                {t('otp.changeNumber')}
              </button>
            </>
          )}
        </div>
      </div>
      <form
        className="flex flex-col gap-24"
        aria-busy={loading}
        onSubmit={(event) => {
          event.preventDefault();
          void (step === 'mobile' ? requestOtp() : verify());
        }}
      >
        {step === 'mobile' ? (
          <>
            <MobileInput value={mobile} onChange={setMobile} error={error ?? undefined} disabled={loading} />
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading || !e164}>
              {loading ? t('visual.sending') : t('signIn.sendCode')}
            </Button>
          </>
        ) : (
          <>
            {isClientDemoHintMobile(e164) ? (
              <p className="type-body-caption text-text-muted" data-testid="otp-demo-hint">{t('otp.demoHint')}</p>
            ) : null}
            <OtpInput value={code} onChange={setCode} error={error ?? undefined} disabled={loading} />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading || code.length !== 6}
            >
              {loading ? t('visual.verifying') : t('signIn.verify')}
            </Button>
            <Button
              variant="ghost"
              size="md"
              className="justify-start px-0 text-text-muted"
              disabled={loading || resendAfter > 0}
              onClick={() => void requestOtp()}
            >
              {resendAfter > 0 ? t('otp.resendWait', { seconds: resendAfter }) : t('otp.resend')}
            </Button>
          </>
        )}
      </form>
      {step === 'mobile' && <p className="type-label-caption text-text-muted">{t('visual.terms')}</p>}
      {loading && (
        <p role="status" className="type-label-caption text-text-brand">
          {step === 'otp' ? t('visual.verifying') : t('visual.sending')}
        </p>
      )}
    </div>
  );
}
