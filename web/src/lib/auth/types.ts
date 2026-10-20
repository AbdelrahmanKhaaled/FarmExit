export type AuthUser = {
  id: string;
  fullName: string | null;
  mobileE164: string;
  email: string | null;
  mobileVerified: boolean;
  profileCompleted: boolean;
};

export type TokenPair = {
  tokenType: 'Bearer';
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

export type VerifyOtpResponse = TokenPair & {
  user: AuthUser;
  isNewUser: boolean;
};
