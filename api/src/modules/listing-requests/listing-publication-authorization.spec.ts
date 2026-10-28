import { ListingPublicationService } from './listing-publication.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';

jest.mock('../../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../authorization/staff-authorization.service', () => ({
  StaffAuthorizationService: class {}, STAFF_STATUS_ACTIVE: 'active',
}));
jest.mock('./listing-requests.service', () => ({ LISTING_APPROVED: 'approved', LISTING_PUBLISHED: 'published' }));

describe('publication authorization', () => {
  const userId = 1n;
  function setup(roles: string[] | null) {
    const prisma = { farm: { findMany: jest.fn().mockResolvedValue([]) } };
    const auth = { loadContext: jest.fn().mockResolvedValue(roles ? { roles } : null) };
    return {
      prisma,
      service: new ListingPublicationService(prisma as unknown as PrismaService, auth as unknown as StaffAuthorizationService),
    };
  }
  it.each(['admin', 'superAdmin'])('permits active %s to read the queue', async role => {
    const { service } = setup([role]);
    await expect(service.queue(userId, {})).resolves.toMatchObject({ items: [], total: 0 });
  });
  it.each([{ roles: ['reviewer'] }, { roles: ['caseAgent'] }, { roles: [] }, { roles: null }])('denies restricted or inactive staff $roles before reading data', async ({ roles }) => {
    const { service, prisma } = setup(roles);
    await expect(service.queue(userId, {})).rejects.toMatchObject({ status: 403 });
    expect(prisma.farm.findMany).not.toHaveBeenCalled();
    await expect(service.publish(userId, 2n)).rejects.toMatchObject({ status: 403 });
  });
  it.each(['admin', 'superAdmin'])('rechecks active %s membership inside publication transaction', async role => {
    const { service } = setup([role]);
    const tx = {
      staffMembership: { findFirst: jest.fn().mockImplementation(({ where }: { where: { status: string; staffRole: { in: string[] } } }) =>
        Promise.resolve(where.status === 'active' && where.staffRole.in.includes(role) ? { id: 1n } : null)) },
      request: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    // Stop at missing request, before any publication writes.
    await expect(service['publishOnce'](tx as never, userId, 2n, new Date())).rejects.toMatchObject({ status: 404 });
    expect(tx.request.findFirst).toHaveBeenCalled();
  });
});
