import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.decorators';
import { isProfileCompleted, profileIncomplete, unauthorized } from './auth.errors';

/**
 * Blocks users who signed in but have not completed their profile (phone -> OTP -> profile). Use it after
 * `AccessTokenGuard` on every protected business action, via `@RequireCompletedProfile()`. Auth, profile and
 * logout routes deliberately use `AccessTokenGuard` alone so an incomplete user can still finish onboarding.
 */
@Injectable()
export class CompletedProfileGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const auth = context.switchToHttp().getRequest<AuthenticatedRequest>().auth;
    if (!auth) throw unauthorized();
    if (!isProfileCompleted(auth.user)) throw profileIncomplete();
    return true;
  }
}
