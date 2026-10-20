import { ManagementWizard, type ManagementFarmOption } from './ManagementWizard';
export function NewManagementRequestForm(props: {
  farms: ManagementFarmOption[];
  initialFarmId?: string;
  initialStep?: number;
}) {
  return <ManagementWizard {...props} />;
}
