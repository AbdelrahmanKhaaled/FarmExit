import { ForbiddenException, HttpStatus } from '@nestjs/common';

export const FORBIDDEN = 'FORBIDDEN';

/**
 * One 403 for "not staff", "wrong role", "missing permission" and "no access to this resource", so a response never
 * tells a caller which roles exist or which resources exist.
 */
export function forbidden(): ForbiddenException {
  return new ForbiddenException({
    statusCode: HttpStatus.FORBIDDEN,
    error: 'Forbidden',
    code: FORBIDDEN,
    message: 'You do not have access to this resource',
  });
}
