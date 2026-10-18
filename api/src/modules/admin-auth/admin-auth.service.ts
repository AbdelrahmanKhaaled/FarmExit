import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AccountStatus, AuthSessionAudience } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { unauthorized } from '../auth/auth.errors';
import { AuthService } from '../auth/auth.service';
import type { ClientContext } from '../auth/auth.types';
import type { TokenPairResponseDto } from '../auth/dto/auth.dto';
import { isValidStoredEgyptianMobile } from '../auth/phone-number';
import { TokenService } from '../auth/token.service';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { staffHasDashboardAccess } from '../authorization/staff-permissions';
import { normalizeDashboardEmail } from './dashboard-email';
import type { AdminAuthStaffDto, AdminLoginResponseDto, AdminMeResponseDto } from './dto/admin-auth.dto';
import { PasswordService } from './password.service';

const INVALID_LOGIN_MESSAGE = 'Invalid email or password';
const DASHBOARD_DEVICE_NAME = 'farmexit-dashboard';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly staffAuth: StaffAuthorizationService,
  ) {}

  async login(emailInput: string, password: string, client: ClientContext): Promise<AdminLoginResponseDto> {
    const email = normalizeDashboardEmail(emailInput);
    if (!email) throw new BadRequestException('Enter a valid email address');

    const credential = await this.prisma.adminCredential.findUnique({
      where: { email },
      include: { user: true },
    });
    if (!credential || !credential.isActive) {
      await this.delayJitter();
      throw new UnauthorizedException(INVALID_LOGIN_MESSAGE);
    }

    const now = new Date();
    if (credential.lockedUntil && credential.lockedUntil.getTime() > now.getTime()) {
      throw new UnauthorizedException(INVALID_LOGIN_MESSAGE);
    }

    const valid = await this.passwords.verify(credential.passwordHash, password);
    if (!valid) {
      await this.recordFailedLogin(credential.id, credential.failedLoginAttempts, now);
      throw new UnauthorizedException(INVALID_LOGIN_MESSAGE);
    }

    const user = credential.user;
    if (user.accountStatus !== AccountStatus.active || !isValidStoredEgyptianMobile(user.mobileE164)) {
      throw new UnauthorizedException(INVALID_LOGIN_MESSAGE);
    }

    const staff = await this.staffAuth.loadContext(user.id);
    if (!staff || !staffHasDashboardAccess(staff.roles)) {
      throw new UnauthorizedException(INVALID_LOGIN_MESSAGE);
    }

    await this.prisma.adminCredential.update({
      where: { id: credential.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: now },
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now },
    });

    const pair = await this.auth.createSessionForUser(
      user.id,
      client,
      DASHBOARD_DEVICE_NAME,
      AuthSessionAudience.dashboard,
    );
    return { ...pair, staff: toStaffDto(staff, email, user.fullName) };
  }

  async refresh(refreshToken: string): Promise<TokenPairResponseDto> {
    const parsed = this.tokens.parseRefreshToken(refreshToken);
    if (!parsed) throw unauthorized();
    const session = await this.prisma.userSession.findUnique({ where: { id: parsed.sessionId } });
    if (!session || session.authAudience !== AuthSessionAudience.dashboard) throw unauthorized();
    return this.auth.refresh(refreshToken);
  }

  async logout(sessionId: bigint): Promise<void> {
    await this.auth.logout(sessionId);
  }

  async me(userId: bigint): Promise<AdminMeResponseDto> {
    const staff = await this.staffAuth.loadContext(userId);
    if (!staff || !staffHasDashboardAccess(staff.roles)) {
      throw new UnauthorizedException();
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const credential = await this.prisma.adminCredential.findUnique({ where: { userId } });
    const email = credential?.email ?? user?.email ?? '';
    return { staff: toStaffDto(staff, email, user?.fullName ?? null) };
  }

  private async recordFailedLogin(credentialId: bigint, previousAttempts: number, now: Date): Promise<void> {
    const attempts = previousAttempts + 1;
    const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS ? new Date(now.getTime() + LOCKOUT_MS) : null;
    await this.prisma.adminCredential.update({
      where: { id: credentialId },
      data: { failedLoginAttempts: attempts, lockedUntil },
    });
  }

  private async delayJitter(): Promise<void> {
    await new Promise((r) => setTimeout(r, 50 + Math.floor(Math.random() * 50)));
  }
}

function toStaffDto(
  staff: { userId: bigint; roles: string[]; permissions: string[] },
  email: string,
  fullName: string | null,
): AdminAuthStaffDto {
  return {
    userId: staff.userId.toString(),
    fullName,
    email,
    roles: staff.roles,
    permissions: staff.permissions,
  };
}
