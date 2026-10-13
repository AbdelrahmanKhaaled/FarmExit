/**
 * Minimal in-memory stand-in for PrismaService covering exactly the calls the auth module makes (users, OTPs,
 * sessions), so auth e2e tests run without MySQL and never touch real data.
 */
type Row = Record<string, unknown>;
type Where = Record<string, unknown>;
type Args = { where?: Where; data?: Row; orderBy?: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[] };

const isOperator = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !(value instanceof Date);

const comparable = (value: unknown): number | bigint | string => {
  if (value instanceof Date) return value.getTime();
  return value as number | bigint | string;
};

function matches(row: Row, where: Where = {}): boolean {
  return Object.entries(where).every(([key, expected]) => {
    const actual = row[key];
    if (expected === null) return actual === null || actual === undefined;
    if (isOperator(expected)) {
      if ('not' in expected) return comparable(actual) !== comparable(expected.not);
      const a = comparable(actual);
      return (
        (expected.lt === undefined || a < comparable(expected.lt)) &&
        (expected.lte === undefined || a <= comparable(expected.lte)) &&
        (expected.gt === undefined || a > comparable(expected.gt)) &&
        (expected.gte === undefined || a >= comparable(expected.gte))
      );
    }
    return comparable(actual) === comparable(expected);
  });
}

function applyData(row: Row, data: Row): void {
  for (const [key, value] of Object.entries(data)) {
    if (isOperator(value) && 'increment' in value) row[key] = (row[key] as number) + (value.increment as number);
    else row[key] = value;
  }
}

export class FakeTable {
  rows: Row[] = [];
  private nextId = 1n;

  takeId(): bigint {
    return this.nextId++;
  }

  constructor(
    private readonly defaults: () => Row,
    private readonly uniqueKeys: string[] = [],
  ) {}

  create({ data }: { data: Row }): Promise<Row> {
    for (const key of this.uniqueKeys) {
      if (data[key] != null && this.rows.some((r) => r[key] === data[key])) {
        return Promise.reject(Object.assign(new Error(`Unique constraint failed on ${key}`), { code: 'P2002' }));
      }
    }
    const row: Row = { ...this.defaults(), ...data, id: this.nextId++ };
    this.rows.push(row);
    return Promise.resolve({ ...row });
  }

  findFirst(args: Args = {}): Promise<Row | null> {
    const found = this.sorted(
      this.rows.filter((r) => matches(r, args.where)),
      args.orderBy,
    )[0];
    return Promise.resolve(found ? { ...found } : null);
  }

  findUnique(args: Args & { include?: Record<string, boolean> }): Promise<Row | null> {
    return this.findFirst(args);
  }

  findMany(args: Args = {}): Promise<Row[]> {
    return Promise.resolve(
      this.sorted(
        this.rows.filter((r) => matches(r, args.where)),
        args.orderBy,
      ).map((r) => ({ ...r })),
    );
  }

  count(args: Args = {}): Promise<number> {
    return Promise.resolve(this.rows.filter((r) => matches(r, args.where)).length);
  }

  updateMany({ where, data }: { where?: Where; data: Row }): Promise<{ count: number }> {
    const targets = this.rows.filter((r) => matches(r, where));
    const clash = this.uniqueKeys.find(
      (key) => data[key] != null && this.rows.some((r) => !targets.includes(r) && r[key] === data[key]),
    );
    if (clash)
      return Promise.reject(Object.assign(new Error(`Unique constraint failed on ${clash}`), { code: 'P2002' }));
    targets.forEach((r) => applyData(r, data));
    return Promise.resolve({ count: targets.length });
  }

  update({ where, data }: { where: Where; data: Row }): Promise<Row> {
    const target = this.rows.find((r) => matches(r, where));
    if (!target) return Promise.reject(new Error('Record to update not found'));
    applyData(target, data);
    return Promise.resolve({ ...target });
  }

  private sorted(rows: Row[], orderBy: Args['orderBy']): Row[] {
    const order = orderBy === undefined ? [] : Array.isArray(orderBy) ? orderBy : [orderBy];
    return [...rows].sort((a, b) => {
      for (const clause of order) {
        const [key, dir] = Object.entries(clause)[0];
        const av = comparable(a[key]);
        const bv = comparable(b[key]);
        if (av === bv) continue;
        return (av < bv ? -1 : 1) * (dir === 'asc' ? 1 : -1);
      }
      return 0;
    });
  }
}

export function createFakePrisma() {
  const user = new FakeTable(
    () => ({
      fullName: null,
      email: null,
      avatarStorageKey: null,
      mobileVerifiedAt: null,
      lastLoginAt: null,
      accountStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    ['mobileE164', 'email'],
  );
  const userSessionToken = new FakeTable(() => ({ consumedAt: new Date() }));
  const staffMembership = new FakeTable(() => ({ status: 'active', createdAt: new Date() }));
  const farmRelationship = new FakeTable(() => ({
    relationshipStatus: 'active',
    startsAt: null,
    endsAt: null,
    createdAt: new Date(),
  }));
  const otpVerification = new FakeTable(() => ({ userId: null, attempts: 0, consumedAt: null }));
  const sessionTable = new FakeTable(() => ({ deviceName: null, userAgent: null, ipAddress: null, revokedAt: null }));

  const userSession = Object.assign(sessionTable, {
    // `include: { user: true }` joins the owning user.
    findUnique: async (args: Args & { include?: Record<string, boolean> }): Promise<Row | null> => {
      const session = await FakeTable.prototype.findFirst.call(sessionTable, args);
      if (!session || !args.include?.user) return session;
      return { ...session, user: await user.findFirst({ where: { id: session.userId } }) };
    },
  });

  /**
   * Emulates the single atomic INSERT INTO otp_verifications ... SELECT ... WHERE NOT EXISTS (cooldown) AND
   * (hourly count) < max statement (JS is synchronous between the check and the push, like InnoDB's atomic insert).
   * Template values, in order: userId, mobile, purpose, codeHash, expiresAt, createdAt, mobile, cooldownCutoff,
   * mobile, hourCutoff, maxPerHour.
   */
  const $executeRaw = (strings: TemplateStringsArray, ...v: unknown[]): Promise<number> => {
    if (!strings.join('?').includes('INSERT INTO otp_verifications')) throw new Error('Unsupported raw SQL in fake');
    const [userId, mobile, purpose, codeHash, expiresAt, createdAt, , cooldownCutoff, , hourCutoff, max] = v as [
      bigint | null,
      string,
      string,
      string,
      Date,
      Date,
      string,
      Date,
      string,
      Date,
      number,
    ];
    const mine = otpVerification.rows.filter((r) => r.mobileE164 === mobile);
    const inCooldown = mine.some((r) => (r.createdAt as Date) > cooldownCutoff);
    const lastHour = mine.filter((r) => (r.createdAt as Date) >= hourCutoff).length;
    if (inCooldown || lastHour >= max) return Promise.resolve(0);
    otpVerification.rows.push({
      ...{ userId: null, attempts: 0, consumedAt: null },
      id: otpVerification.takeId(),
      userId,
      mobileE164: mobile,
      purpose,
      codeHash,
      expiresAt,
      createdAt,
    });
    return Promise.resolve(1);
  };

  return {
    user,
    otpVerification,
    userSession,
    staffMembership,
    farmRelationship,
    userSessionToken,
    $executeRaw,
    $disconnect: () => Promise.resolve(),
  };
}

export type FakePrisma = ReturnType<typeof createFakePrisma>;
