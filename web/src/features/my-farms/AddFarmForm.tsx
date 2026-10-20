import type { AuthUser } from '@/lib/auth/types';
import { AddFarmWizard } from './AddFarmWizard';
export function AddFarmForm({ user }: { user: AuthUser }) {
  return <AddFarmWizard user={user} />;
}
