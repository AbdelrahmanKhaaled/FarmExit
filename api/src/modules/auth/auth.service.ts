import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { User } from '../../generated/prisma/client';
import { AccountStatus, AuthSessionAudience } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { invalidCode, isProfileCompleted, profileIncomplete, unauthorized } from './auth.errors';
import type { ClientContext } from './auth.types';
import type {
  AuthUserDto,
  CompleteProfileDto,
  RequestOtpDto,
  RequestOtpResponseDto,
  TokenPairResponseDto,
  UpdateProfileDto,
  VerifyOtpDto,
  VerifyOtpResponseDto,
} from './dto/auth.dto';
import { OtpService } from './otp.service';
import { normalizeMobile } from './phone-number';
import { TokenService } from './token.service';

const MAX_USER_AGENT_LENGTH = 512;
const MAX_IP_LENGTH = 45;
/** Window in which a duplicate of the newest consumed refresh token is treated as a benign race, not theft. */
export const REFRESH_DUPLICATE_GRACE_MS = 3000;

/**
 * Mobile + OTP authentication. Accounts have no global role: this service only proves who the caller is. Farm
 * roles and FarmExit staff permissions are resolved elsewhere, never from tokens or from this module.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
  ) {}

  requestOtp(dto: RequestOtpDto): Promise<RequestOtpResponseDto> {
    return this.otp.issue(this.mobileOrThrow(dto.mobile));
  }

  async verifyOtp(dto: VerifyOtpDto, client: ClientContext): Promise<VerifyOtpResponseDto> {
    const mobile = this.mobileOrThrow(dto.mobile);
    const { otpId } = await this.otp.check(mobile, dto.code);

    const existing = await this.prisma.user.findUnique({ where: { mobileE164: mobile } });
    if (existing && existing.accountStatus !== AccountStatus.active) {
      throw new ForbiddenException('This account is not active');
    }

    if (!(await this.otp.consume(otpId))) throw invalidCode();

    const now = new Date();
    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: { lastLoginAt: now, mobileVerifiedAt: existing.mobileVerifiedAt ?? now },
        })
      : await this.createUser(mobile, now);

    const pair = await this.startSession(user.id, client, dto.deviceName, now, AuthSessionAudience.website);
    return { ...pair, user: toAuthUser(user), isNewUser: !existing };
  }

  /** Rotates the refresh token. A reused (already rotated) token revokes its whole session. */
  async refresh(refreshToken: string): Promise<TokenPairResponseDto> {
    const parsed = this.tokens.parseRefreshToken(refreshToken);
    if (!parsed) throw unauthorized();

    const session = await this.prisma.userSession.findUnique({
      where: { id: parsed.sessionId },
      include: { user: true },
    });
    const now = new Date();
    if (!session || session.revokedAt !== null || session.expiresAt.getTime() <= now.getTime()) throw unauthorized();

    const presentedHash = this.tokens.hashRefreshSecret(parsed.secret);
    const presented = Buffer.from(presentedHash);
    const stored = Buffer.from(session.sessionTokenHash);
    if (presented.length !== stored.length || !timingSafeEqual(presented, stored)) {
      // Only a secret that WAS issued for this session and already rotated proves theft. A wrong or random secret
      // (anyone can guess a session id) must not revoke somebody else's session.
      await this.rejectConsumedToken(session.id, presentedHash, now);
      throw unauthorized();
    }
    if (session.user.accountStatus !== AccountStatus.active) {
      await this.revoke(session.id);
      throw unauthorized();
    }

    // The current hash becomes consumed history BEFORE rotation (idempotent), so no request can ever hold a valid
    // old token that is missing from the history, even if a concurrent request wins the rotation below.
    await this.recordConsumed(session.id, session.sessionTokenHash, now);

    const next = this.tokens.generateRefreshSecret();
    const expiresAt = new Date(now.getTime() + this.tokens.refreshTtlMs);
    const rotated = await this.prisma.userSession.updateMany({
      where: { id: session.id, sessionTokenHash: session.sessionTokenHash, revokedAt: null },
      data: { sessionTokenHash: next.hash, lastSeenAt: now, expiresAt },
    });
    if (rotated.count !== 1) {
      // Another request rotated this exact token first. A duplicate sent at the same moment is a benign race (the
      // winner keeps its session); anything else is a replay and ends the session.
      await this.rejectConsumedToken(session.id, presentedHash, now);
      throw unauthorized();
    }
    return this.tokenPair(session.userId, session.id, next.secret, expiresAt, now);
  }

  /** Revokes one session (idempotent). */
  async logout(sessionId: bigint): Promise<void> {
    await this.revoke(sessionId);
  }

  /** Starts a session for an already-authenticated user (e.g. dashboard email/password login). */
  createSessionForUser(
    userId: bigint,
    client: ClientContext,
    deviceName?: string,
    authAudience: AuthSessionAudience = AuthSessionAudience.website,
  ): Promise<TokenPairResponseDto> {
    return this.startSession(userId, client, deviceName, new Date(), authAudience);
  }

  /** First-time profile completion (phone -> OTP -> profile). Can only happen once. */
  async completeProfile(userId: bigint, dto: CompleteProfileDto): Promise<AuthUserDto> {
    const data: { fullName: string; email?: string } = { fullName: dto.fullName };
    if (dto.email !== undefined) data.email = dto.email;
    const updated = await this.writeProfile({ id: userId, fullName: null }, data);
    if (updated === 0) throw new ConflictException('Profile already completed');
    return this.currentUser(userId);
  }

  /** Later edits. Requires a completed profile; the name can be changed but never cleared. */
  async updateProfile(user: User, dto: UpdateProfileDto): Promise<AuthUserDto> {
    if (!isProfileCompleted(user)) throw profileIncomplete();
    if (dto.fullName === undefined && dto.email === undefined) throw new BadRequestException('Nothing to update');
    const data: { fullName?: string; email?: string | null } = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.email !== undefined) data.email = dto.email;
    await this.writeProfile({ id: user.id }, data);
    return this.currentUser(user.id);
  }

  toAuthUser(user: User): AuthUserDto {
    return toAuthUser(user);
  }

  private async writeProfile(
    where: { id: bigint; fullName?: null },
    data: { fullName?: string; email?: string | null },
  ): Promise<number> {
    try {
      return (await this.prisma.user.updateMany({ where, data })).count;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Email is already in use');
      throw error;
    }
  }

  private async currentUser(userId: bigint): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw unauthorized();
    return toAuthUser(user);
  }

  private mobileOrThrow(input: string): string {
    const mobile = normalizeMobile(input);
    if (!mobile) throw new BadRequestException('Enter a valid mobile number');
    return mobile;
  }

  /** First sign-in: the account exists with no name until the user completes their profile. */
  private async createUser(mobileE164: string, now: Date): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: { mobileE164, mobileVerifiedAt: now, lastLoginAt: now, createdAt: now },
      });
    } catch (error) {
      // A concurrent verification created the same account first (unique mobile): use it.
      if ((error as { code?: string }).code === 'P2002') {
        return this.prisma.user.update({
          where: { mobileE164 },
          data: { lastLoginAt: now, mobileVerifiedAt: now },
        });
      }
      throw error;
    }
  }

  private async startSession(
    userId: bigint,
    client: ClientContext,
    deviceName: string | undefined,
    now: Date,
    authAudience: AuthSessionAudience,
  ): Promise<TokenPairResponseDto> {
    const refresh = this.tokens.generateRefreshSecret();
    const expiresAt = new Date(now.getTime() + this.tokens.refreshTtlMs);
    const session = await this.prisma.userSession.create({
      data: {
        userId,
        authAudience,
        sessionTokenHash: refresh.hash,
        deviceName: deviceName ?? null,
        userAgent: client.userAgent?.slice(0, MAX_USER_AGENT_LENGTH) ?? null,
        ipAddress: client.ip?.slice(0, MAX_IP_LENGTH) ?? null,
        expiresAt,
        lastSeenAt: now,
        createdAt: now,
      },
    });
    return this.tokenPair(userId, session.id, refresh.secret, expiresAt, now);
  }

  private tokenPair(
    userId: bigint,
    sessionId: bigint,
    refreshSecret: string,
    refreshExpiresAt: Date,
    now: Date,
  ): TokenPairResponseDto {
    return {
      tokenType: 'Bearer',
      accessToken: this.tokens.signAccessToken(userId, sessionId, now),
      accessTokenExpiresInSeconds: this.tokens.accessTtlSeconds,
      refreshToken: this.tokens.formatRefreshToken(sessionId, refreshSecret),
      refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
    };
  }

  /**
   * A presented refresh secret failed to rotate. If it is a previously consumed secret of this session it is
   * normally theft: revoke the session. The one narrow exception is a duplicate of the MOST RECENTLY consumed
   * secret within REFRESH_DUPLICATE_GRACE_MS (a client retrying or firing parallel refreshes): it is rejected with
   * no tokens issued and the session, with its newly rotated token, stays valid. Older tokens, later replays and
   * unknown secrets (never revoke: session ids are guessable) are unaffected by the exception.
   */
  private async rejectConsumedToken(sessionId: bigint, tokenHash: string, now: Date): Promise<void> {
    const consumed = await this.prisma.userSessionToken.findFirst({ where: { sessionId, tokenHash } });
    if (!consumed) return;

    const newest = await this.prisma.userSessionToken.findFirst({
      where: { sessionId },
      orderBy: [{ consumedAt: 'desc' }, { id: 'desc' }],
    });
    const isNewest = newest?.tokenHash === tokenHash;
    const age = now.getTime() - consumed.consumedAt.getTime();
    if (isNewest && age <= REFRESH_DUPLICATE_GRACE_MS) return;
    await this.revoke(sessionId);
  }
  private async recordConsumed(sessionId: bigint, tokenHash: string, now: Date): Promise<void> {
    try {
      await this.prisma.userSessionToken.create({ data: { sessionId, tokenHash, consumedAt: now } });
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error; // already recorded by a concurrent request
    }
  }

  private async revoke(sessionId: bigint): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

function toAuthUser(user: User): AuthUserDto {
  return {
    id: user.id.toString(),
    fullName: user.fullName,
    mobileE164: user.mobileE164,
    email: user.email,
    mobileVerified: user.mobileVerifiedAt !== null,
    profileCompleted: isProfileCompleted(user),
  };
}
