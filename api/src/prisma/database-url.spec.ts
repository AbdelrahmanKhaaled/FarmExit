import { toMariaDbPoolConfig } from './database-url';

describe('toMariaDbPoolConfig', () => {
  it('converts a Prisma MySQL URL into pool options', () => {
    expect(toMariaDbPoolConfig('mysql://farmexit:p%40ss%3Aword@db.local:3307/farmexit')).toEqual({
      host: 'db.local',
      port: 3307,
      user: 'farmexit',
      password: 'p@ss:word',
      database: 'farmexit',
      timezone: 'Z',
    });
  });

  it('defaults the port to 3306', () => {
    expect(toMariaDbPoolConfig('mysql://u:p@localhost/farmexit').port).toBe(3306);
  });

  it('rejects other schemes and a missing database', () => {
    expect(() => toMariaDbPoolConfig('postgres://u:p@localhost/farmexit')).toThrow(/mysql/);
    expect(() => toMariaDbPoolConfig('mysql://u:p@localhost')).toThrow(/database/);
  });
});
