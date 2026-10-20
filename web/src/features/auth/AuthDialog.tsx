'use client';
import { useId, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { IconButton } from '@/components/ui/IconButton';
import { useModalDialog } from '@/components/overlay/use-modal-dialog';
export function AuthDialog({ children }: { children: ReactNode }) {
  const router = useRouter();
  const t = useTranslations('common.actions');
  const label = useTranslations('auth');
  const id = useId();
  const dialog = useModalDialog(true, (open) => {
    if (!open) router.back();
  });
  return (
    <dialog
      {...dialog}
      aria-labelledby={id}
      className="fx-overlay fx-dialog m-auto size-full max-h-none max-w-none bg-transparent p-0 tablet:h-fit tablet:max-h-[calc(100dvh-48px)] tablet:w-480"
    >
      <div className="flex max-h-dvh min-h-dvh flex-col gap-40 overflow-y-auto bg-bg-surface px-24 pb-40 pt-24 tablet:min-h-0 tablet:rounded-card tablet:p-40 tablet:effect-floating-glass">
        <header className="flex items-center justify-between gap-16">
          <span className="tablet:hidden">
            <Logo variant="icon" height={36} />
          </span>
          <span className="hidden tablet:block">
            <Logo variant="horizontal" height={32} />
          </span>
          <span id={id} className="sr-only">
            {label('signIn.title')}
          </span>
          <IconButton variant="round" icon="close" label={t('close')} onClick={() => router.back()} />
        </header>
        {children}
      </div>
    </dialog>
  );
}
