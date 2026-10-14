import { randomBytes } from 'node:crypto';

export function newRequestNumber(prefix: string): string {
  return `${prefix}${randomBytes(12).toString('hex')}`.toUpperCase();
}
