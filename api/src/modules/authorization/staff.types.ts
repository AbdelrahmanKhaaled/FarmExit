import type { StaffRole } from '../../generated/prisma/enums';
import type { StaffPermission } from './staff-permissions';

/**
 * The caller's FarmExit staff identity, loaded from the database for each request (never from the token or any
 * client input). Separate from farm roles, which are contextual to a farm.
 */
export type StaffContext = {
  userId: bigint;
  roles: StaffRole[];
  permissions: StaffPermission[];
};
