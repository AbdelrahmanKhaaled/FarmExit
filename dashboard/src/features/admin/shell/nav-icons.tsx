import type { ComponentType } from 'react';
import {
  IconAnalytics,
  IconAudit,
  IconChat,
  IconClipboard,
  IconFarm,
  IconInbox,
  IconList,
  IconOverview,
  IconProposal,
  IconShield,
  IconUsers,
} from '@/design-system/icons';

type IconProps = { className?: string };

const MAP: Record<string, ComponentType<IconProps>> = {
  dashboard: IconOverview,
  analytics: IconAnalytics,
  farms: IconFarm,
  listings: IconList,
  listingPipeline: IconInbox,
  requestsHub: IconInbox,
  proposals: IconProposal,
  coPurchase: IconUsers,
  farmDetails: IconClipboard,
  farmManagement: IconFarm,
  partnerships: IconUsers,
  verification: IconShield,
  evaluations: IconClipboard,
  communications: IconChat,
  users: IconUsers,
  administrators: IconShield,
  auditLogs: IconAudit,
  settings: IconShield,
};

export function NavIcon({ itemKey, className }: { itemKey: string; className?: string }) {
  const Icon = MAP[itemKey] ?? IconOverview;
  return <Icon className={className} />;
}
