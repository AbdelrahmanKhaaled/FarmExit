import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';

/** 429 with a machine-readable wait time (the `Retry-After` header is set by the rate-limit guard). */
export function tooManyRequests(message: string, retryAfterSeconds: number): HttpException {
  return new HttpException(
    { statusCode: HttpStatus.TOO_MANY_REQUESTS, error: 'Too Many Requests', message, retryAfterSeconds },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

/** One message for wrong, expired, unknown or already-used codes, so responses reveal nothing about the number. */
export function invalidCode(): BadRequestException {
  return new BadRequestException('Invalid or expired verification code');
}

export function unauthorized(): UnauthorizedException {
  return new UnauthorizedException('Unauthorized');
}

/** The profile is complete once the user has a name (set by POST /auth/profile/complete). */
export function isProfileCompleted(user: { fullName: string | null }): boolean {
  return user.fullName !== null && user.fullName.trim().length > 0;
}

export const PROFILE_INCOMPLETE = 'PROFILE_INCOMPLETE';

/** 403 with a stable machine-readable code so clients can route the user to profile completion. */
export function profileIncomplete(): ForbiddenException {
  return new ForbiddenException({
    statusCode: HttpStatus.FORBIDDEN,
    error: 'Forbidden',
    code: PROFILE_INCOMPLETE,
    message: 'Complete your profile to continue',
  });
}
