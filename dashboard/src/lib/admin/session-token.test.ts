import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isAccessTokenExpired } from './session-token';
import { isAdminConsoleDocumentPath } from './admin-console-path';

function fakeJwt(expSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString('base64url');
  return `${header}.${payload}.sig`;
}

describe('isAccessTokenExpired', () => {
  it('returns false for future exp', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    assert.equal(isAccessTokenExpired(fakeJwt(exp)), false);
  });

  it('returns true for past exp', () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    assert.equal(isAccessTokenExpired(fakeJwt(exp)), true);
  });
});

describe('isAdminConsoleDocumentPath', () => {
  it('matches localized admin console', () => {
    assert.equal(isAdminConsoleDocumentPath('/en/admin'), true);
    assert.equal(isAdminConsoleDocumentPath('/ar/admin'), true);
  });

  it('excludes login and forbidden', () => {
    assert.equal(isAdminConsoleDocumentPath('/en/admin/login'), false);
    assert.equal(isAdminConsoleDocumentPath('/ar/admin/forbidden'), false);
  });
});
