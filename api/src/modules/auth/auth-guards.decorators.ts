import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AccessTokenGuard } from './access-token.guard';
import { CompletedProfileGuard } from './completed-profile.guard';

/** Signed-in users only (profile may still be incomplete). For auth/profile/onboarding routes. */
export const Authenticated = (): ClassDecorator & MethodDecorator =>
  applyDecorators(UseGuards(AccessTokenGuard), ApiBearerAuth(), ApiUnauthorizedResponse());

/** Signed-in users with a completed profile. Use on every protected business action. */
export const RequireCompletedProfile = (): ClassDecorator & MethodDecorator =>
  applyDecorators(
    UseGuards(AccessTokenGuard, CompletedProfileGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse(),
    ApiForbiddenResponse({ description: 'Profile not completed (code PROFILE_INCOMPLETE)' }),
  );
