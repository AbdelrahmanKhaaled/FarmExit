import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui';
import {
  IconChat,
  IconFarm,
  IconInbox,
  IconList,
  IconProposal,
  IconSettings,
  IconUsers,
} from '@/components/icons';
import { cn } from '@/lib/cn';

const modules = [
  { key: 'farms' as const, icon: IconFarm },
  { key: 'listings' as const, icon: IconList },
  { key: 'requests' as const, icon: IconInbox },
  { key: 'proposals' as const, icon: IconProposal },
  { key: 'communications' as const, icon: IconChat },
  { key: 'users' as const, icon: IconUsers },
  { key: 'settings' as const, icon: IconSettings },
];

export async function OverviewModuleShortcuts() {
  const t = await getTranslations('admin.nav');
  const tOverview = await getTranslations('admin.overview');

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {modules.map(({ key, icon: Icon }) => (
        <Card
          key={key}
          variant="muted"
          className={cn(
            'group flex cursor-not-allowed items-start gap-3 p-4 opacity-70 transition-opacity',
            'hover:opacity-85',
          )}
          aria-disabled
        >
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-[var(--admin-radius-md)] bg-[color-mix(in_srgb,var(--admin-brand-primary)_10%,white)] text-[var(--admin-brand-primary)]"
          >
            <Icon />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-[var(--admin-text-primary)]">{t(key)}</p>
            <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">{tOverview('modulesSoon')}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
