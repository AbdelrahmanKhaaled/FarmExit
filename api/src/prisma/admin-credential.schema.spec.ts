import { AuthSessionAudience, StaffRole } from '../generated/prisma/enums';
import { createFakePrisma } from '../../test/support/fake-prisma';

describe('admin credential schema (in-memory)', () => {
  it('enforces one admin credential per user and unique email', async () => {
    const prisma = createFakePrisma();
    const user = await prisma.user.create({
      data: { mobileE164: '+201012345678', fullName: 'Admin User' },
    });
    await prisma.adminCredential.create({
      data: {
        userId: user.id,
        email: 'admin@farmexit.test',
        passwordHash: 'argon2id$fake',
      },
    });
    await expect(
      prisma.adminCredential.create({
        data: {
          userId: user.id,
          email: 'other@farmexit.test',
          passwordHash: 'argon2id$fake',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      prisma.adminCredential.create({
        data: {
          userId: user.id + 1n,
          email: 'admin@farmexit.test',
          passwordHash: 'argon2id$fake',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('defaults website audience on OTP sessions and allows dashboard audience', async () => {
    const prisma = createFakePrisma();
    const user = await prisma.user.create({
      data: { mobileE164: '+201055544433', fullName: 'Site User' },
    });
    const website = await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionTokenHash: 'hash-website',
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    expect(website.authAudience).toBe('website');
    const dashboard = await prisma.userSession.create({
      data: {
        userId: user.id,
        authAudience: AuthSessionAudience.dashboard,
        sessionTokenHash: 'hash-dashboard',
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    expect(dashboard.authAudience).toBe(AuthSessionAudience.dashboard);
  });

  it('preserves staff roles without a global users.role column', async () => {
    const prisma = createFakePrisma();
    const user = await prisma.user.create({
      data: { mobileE164: '+201077766655', fullName: 'Reviewer' },
    });
    await prisma.staffMembership.create({
      data: { userId: user.id, staffRole: StaffRole.reviewer, status: 'active' },
    });
    const row = await prisma.user.findUnique({ where: { id: user.id } });
    expect(row).not.toHaveProperty('role');
  });
});
