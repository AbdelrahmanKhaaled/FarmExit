import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { AccountStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedRequest } from './auth.decorators';
import { unauthorized } from './auth.errors';
import { TokenService } from './token.service';

/**
 * Authenticates `Authorization: Bearer <access token>`. Besides the JWT signature and expiry it checks the backing
 * session on every request, so logout/revocation takes effect immediately, and that the account is still active.
 * It authenticates only: roles and permissions are never read from the token.
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = req.headers.authorization;
    const match = typeof header === 'string' ? /^Bearer ([^\s]+)$/.exec(header) : null;
    if (!match) throw unauthorized();

    const claims = this.tokens.verifyAccessToken(match[1]);
    if (!claims) throw unauthorized();

    const session = await this.prisma.userSession.findUnique({
      where: { id: BigInt(claims.sid) },
      include: { user: true },
    });
    if (
      !session ||
      session.userId.toString() !== claims.sub ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now() ||
      session.user.accountStatus !== AccountStatus.active
    ) {
      throw unauthorized();
    }

    req.auth = { userId: session.userId, sessionId: session.id, user: session.user };
    return true;
  }
}
