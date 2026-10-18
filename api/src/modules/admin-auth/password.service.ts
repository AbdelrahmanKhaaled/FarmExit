import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { validatePasswordPolicy } from './password-policy';

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const policyError = validatePasswordPolicy(password);
    if (policyError) throw new Error(policyError);
    return argon2.hash(password, { type: argon2.argon2id });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }
}
