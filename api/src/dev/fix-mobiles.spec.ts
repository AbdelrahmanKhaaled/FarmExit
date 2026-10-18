import { StaffRole } from '../generated/prisma/enums';
import {
  buildMobileFixPlan,
  isStoredEgyptianMobileValid,
  isSyntheticDevUser,
  summarizePlan,
} from './fix-mobiles';

describe('fix-mobiles', () => {
  it('accepts valid stored Egyptian numbers', () => {
    expect(isStoredEgyptianMobileValid('+201012345678')).toBe(true);
    expect(isStoredEgyptianMobileValid('+201612345678')).toBe(false);
  });

  it('detects synthetic dev users', () => {
    expect(
      isSyntheticDevUser({ fullName: '[DEMO] Owner', email: 'x@test.com', mobileE164: '+201099999999' }),
    ).toBe(true);
    expect(
      isSyntheticDevUser({ fullName: 'Real Person', email: 'a@company.com', mobileE164: '+201012345678' }),
    ).toBe(false);
  });

  it('keeps valid numbers and assigns synthetic replacements for invalid demo users', () => {
    const plan = buildMobileFixPlan([
      {
        id: 1n,
        fullName: '[DEMO] A',
        email: 'a@example.test',
        mobileE164: '+201000000001',
        staffRoles: [],
      },
      {
        id: 2n,
        fullName: '[DEMO] Bad',
        email: null,
        mobileE164: 'not-a-phone',
        staffRoles: [StaffRole.admin],
      },
      {
        id: 3n,
        fullName: 'Production User',
        email: 'user@real.com',
        mobileE164: 'bad',
        staffRoles: [],
      },
    ]);
    expect(plan.find((r) => r.userId === '1')?.action).toBe('keep');
    expect(plan.find((r) => r.userId === '2')?.proposedMobile).toMatch(/^\+2010990\d{5}$/);
    expect(plan.find((r) => r.userId === '2')?.isAdmin).toBe(true);
    expect(plan.find((r) => r.userId === '3')?.action).toBe('manual_review');
    expect(summarizePlan(plan).toApply).toBe(1);
  });
});
