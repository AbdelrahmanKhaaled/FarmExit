import type { User } from '../../generated/prisma/client';

/** The authenticated caller, attached to the request by `AccessTokenGuard`. */
export type AuthContext = {
  userId: bigint;
  sessionId: bigint;
  user: User;
};

export type ClientContext = {
  ip: string | null;
  userAgent: string | null;
};
