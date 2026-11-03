import type { AuthUser } from '@/lib/auth/types';
import { EntryModeWizard } from './EntryModeWizard';
import type { EntryMode } from './entry-mode';
export function AddFarmForm({ user, entryMode }: { user: AuthUser; entryMode?: EntryMode }) {
  return <EntryModeWizard user={user} entryMode={entryMode} />;
}
