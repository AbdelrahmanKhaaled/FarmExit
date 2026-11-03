'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { NextIntlClientProvider, useLocale, useMessages } from 'next-intl';
import { loadMessages } from '@/i18n/messages';
import type { Locale } from '@/i18n/routing';

type WizardLocale = { locale: Locale; pending: boolean; switchLocale: () => Promise<void>; feedback: (message: string) => string };
const Context = createContext<WizardLocale | null>(null);
export const useWizardLocale = () => useContext(Context);

/** Keep the mounted form (including Files, invalid edits and in-flight saves) while changing UI messages.
 * Native history updates the equivalent URL; refreshing loads that locale from the real server route.
 * No draft creation, submission, automatic translation, or browser storage of private form data occurs here.
 */
export function WizardLocaleBoundary({ children }: { children: ReactNode }) {
  const parent = useWizardLocale();
  return parent ? children : <Provider>{children}</Provider>;
}

function Provider({ children }: { children: ReactNode }) {
  const originalLocale = useLocale() as Locale;
  const originalMessages = useMessages();
  const [locale, setLocale] = useState(originalLocale);
  const [messages, setMessages] = useState(originalMessages);
  const sources = useRef([originalMessages]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  async function switchLocale() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError(false);
    const target = locale === 'ar' ? 'en' : 'ar';
    try {
      const translated = await loadMessages(target);
      sources.current.push(translated);
      const url = new URL(window.location.href);
      url.pathname = url.pathname.replace(/^\/(ar|en)(?=\/|$)/, `/${target}`);
      const returnTo = url.searchParams.get('returnTo');
      if (returnTo?.startsWith(`/${locale}/`)) url.searchParams.set('returnTo', returnTo.replace(`/${locale}/`, `/${target}/`));
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      document.cookie = `NEXT_LOCALE=${target}; Path=/; SameSite=Lax; Max-Age=31536000`;
      document.documentElement.lang = target;
      document.documentElement.dir = target === 'ar' ? 'rtl' : 'ltr';
      setMessages(translated); setLocale(target);
    } catch { setError(true); }
    finally { busy.current = false; setPending(false); }
  }
  return <Context.Provider value={{ locale, pending, switchLocale, feedback: (message) => {
    for (const source of sources.current) { const found = translatedFeedback(message, source, messages); if (found !== null) return found; }
    return message;
  } }}>
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
      {error && <p role="alert">{locale === 'ar' ? 'تعذر تغيير اللغة. بياناتك محفوظة في النموذج. حاول مرة أخرى.' : 'Language could not change. Your form entries are retained. Try again.'}</p>}
    </NextIntlClientProvider>
  </Context.Provider>;
}

/** URL step survives locale switching, saved-draft reloads and supported query parameters. */
export function useWizardStep(step: number, setStep: (step: number) => void, maximum: number, minimum = 1) {
  const context = useWizardLocale();
  const initialized = useRef(false);
  useEffect(() => {
    if (!context || maximum < minimum) return;
    const url = new URL(window.location.href);
    if (!initialized.current) {
      initialized.current = true;
      const stored = Number(url.searchParams.get('step'));
      if (Number.isInteger(stored) && stored >= minimum && stored <= maximum && stored !== step) { setStep(stored); return; }
    }
    url.searchParams.set('step', String(step));
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, [step, setStep, maximum, minimum, context]);
}

// Preserve visible validation errors while translating known interface messages. API text remains verbatim.
function translatedFeedback(message: string, source: unknown, target: unknown): string | null {
  if (typeof source === 'string') return source === message && typeof target === 'string' ? target : null;
  if (!source || typeof source !== 'object' || !target || typeof target !== 'object') return null;
  for (const [key, value] of Object.entries(source)) {
    const found = translatedFeedback(message, value, (target as Record<string, unknown>)[key]);
    if (found !== null) return found;
  }
  return null;
}
export function WizardFeedback({ message }: { message: string | null }) {
  const wizard = useWizardLocale();
  return message ? <>{wizard?.feedback(message) ?? message}</> : null;
}
