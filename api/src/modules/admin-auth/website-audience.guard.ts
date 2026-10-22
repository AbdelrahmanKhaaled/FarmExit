import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { AuthSessionAudience } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedRequest } from '../auth/auth.decorators';
import { unauthorized } from '../auth/auth.errors';

/** Rejects access tokens whose backing session was not created by website (OTP) authentication. */
@Injectable()
export class WebsiteAudienceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.auth) throw unauthorized();
    const session = await this.prisma.userSession.findUnique({
      where: { id: req.auth.sessionId },
      select: { authAudience: true, revokedAt: true, expiresAt: true },
    });
    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now() ||
      session.authAudience !== AuthSessionAudience.website
    ) {
      throw unauthorized();
    }
    return true;
  }
}
