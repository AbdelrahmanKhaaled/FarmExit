/**
 * Minimal in-memory stand-in for PrismaService covering exactly the calls the auth module makes (users, OTPs,
 * sessions), so auth e2e tests run without MySQL and never touch real data.
 */
type Row = Record<string, unknown>;
type Where = Record<string, unknown>;
type Args = {
  where?: Where;
  data?: Row;
  orderBy?: Record<string, unknown> | Record<string, unknown>[];
  skip?: number;
  take?: number;
  select?: Record<string, unknown>;
};

const isOperator = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !(value instanceof Date);

const comparable = (value: unknown): number | bigint | string => {
  if (value instanceof Date) return value.getTime();
  return value as number | bigint | string;
};

function isFixed(value: unknown): value is { toFixed(digits: number): string } {
  if (typeof value !== 'object' || value === null || !('toFixed' in value)) return false;
  return typeof value.toFixed === 'function';
}

/** Decimal columns and query bounds compare as numbers. Dates stay on their timestamps. */
function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'bigint') return Number(value);
  if (!isFixed(value)) return null;
  const parsed = Number(value.toFixed(4));
  return Number.isFinite(parsed) ? parsed : null;
}

function withinBound(actual: unknown, bound: unknown, op: (left: number, right: number) => boolean): boolean {
  if (bound === undefined) return true;
  const left = asNumber(actual);
  const right = asNumber(bound);
  if (left !== null && right !== null) return op(left, right);
  return op(comparable(actual) as number, comparable(bound) as number);
}

function wholePounds(value: unknown): boolean {
  let text: string | null = null;
  if (typeof value === 'number' && Number.isFinite(value)) text = value.toFixed(2);
  else if (isFixed(value)) text = value.toFixed(2);
  else if (typeof value === 'string') text = value;
  if (!text || !/^\d+(\.0+)?$/.test(text)) return false;
  const pounds = Number(text.split('.')[0]);
  return Number.isInteger(pounds) && pounds >= 1;
}

function matches(row: Row, where: Where = {}): boolean {
  return Object.entries(where).every(([key, expected]) => {
    const actual = row[key];
    if (expected === null) return actual === null || actual === undefined;
    if (isOperator(expected)) {
      if ('contains' in expected) {
        const needle = expected.contains;
        if (typeof actual !== 'string' || typeof needle !== 'string') return false;
        return actual.toLowerCase().includes(needle.toLowerCase());
      }
      if ('in' in expected) return (expected.in as unknown[]).some((v) => comparable(v) === comparable(actual));
      if ('notIn' in expected) {
        return !(expected.notIn as unknown[]).some((v) => comparable(v) === comparable(actual));
      }
      if ('not' in expected) return comparable(actual) !== comparable(expected.not);
      return (
        withinBound(actual, expected.lt, (left, right) => left < right) &&
        withinBound(actual, expected.lte, (left, right) => left <= right) &&
        withinBound(actual, expected.gt, (left, right) => left > right) &&
        withinBound(actual, expected.gte, (left, right) => left >= right)
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

  /** Transaction support: copy of the table state, restored on rollback. */
  snapshot(): { rows: Row[]; nextId: bigint } {
    return { rows: this.rows.map((r) => ({ ...r })), nextId: this.nextId };
  }

  restore(state: { rows: Row[]; nextId: bigint }): void {
    this.rows = state.rows;
    this.nextId = state.nextId;
  }

  takeId(): bigint {
    return this.nextId++;
  }

  constructor(
    private readonly defaults: () => Row,
    private readonly uniqueKeys: string[] = [],
    private readonly compositeUnique: string[][] = [],
  ) {}

  create({ data }: { data: Row }): Promise<Row> {
    const clash = this.clash(data, []);
    if (clash) return Promise.reject(Object.assign(new Error(`Unique constraint failed on ${clash}`), { code: 'P2002' }));
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
    const sorted = this.sorted(
      this.rows.filter((r) => matches(r, args.where)),
      args.orderBy,
    );
    const start = args.skip ?? 0;
    const page = args.take === undefined ? sorted.slice(start) : sorted.slice(start, start + args.take);
    return Promise.resolve(page.map((r) => ({ ...r })));
  }
  count(args: Args = {}): Promise<number> {
    return Promise.resolve(this.rows.filter((r) => matches(r, args.where)).length);
  }

  updateMany({ where, data }: { where?: Where; data: Row }): Promise<{ count: number }> {
    const targets = this.rows.filter((r) => matches(r, where));
    const clash = this.clash(data, targets);
    if (clash) return Promise.reject(Object.assign(new Error(`Unique constraint failed on ${clash}`), { code: 'P2002' }));
    targets.forEach((r) => applyData(r, data));
    return Promise.resolve({ count: targets.length });
  }

  deleteMany({ where }: { where?: Where } = {}): Promise<{ count: number }> {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => !matches(r, where));
    return Promise.resolve({ count: before - this.rows.length });
  }

  update({ where, data }: { where: Where; data: Row }): Promise<Row> {
    const target = this.rows.find((r) => matches(r, where));
    if (!target) return Promise.reject(new Error('Record to update not found'));
    applyData(target, data);
    return Promise.resolve({ ...target });
  }

  private clash(data: Row, except: Row[]): string | null {
    for (const key of this.uniqueKeys) {
      if (data[key] != null && this.rows.some((r) => !except.includes(r) && r[key] === data[key])) return key;
    }
    for (const keys of this.compositeUnique) {
      if (keys.some((key) => data[key] == null)) continue;
      const hit = this.rows.some(
        (r) => !except.includes(r) && keys.every((key) => comparable(r[key]) === comparable(data[key])),
      );
      if (hit) return keys.join(',');
    }
    return null;
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
  const farm = new FakeTable(() => ({
    description: null,
    mainActivity: null,
    areaName: null,
    waterSource: null,
    irrigationMethod: null,
    energySource: null,
    soilType: null,
    privatePinLatitude: null,
    privatePinLongitude: null,
    farmStatus: 'active',
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }));
  const farmCropType = new FakeTable(() => ({ createdAt: new Date() }));
  const farmMedia = new FakeTable(() => ({
    licenceStatus: 'pending_confirmation',
    sortOrder: 0,
    isIllustrative: false,
    altEn: null,
    altAr: null,
    width: null,
    height: null,
    createdAt: new Date(),
  }));
  const facilityMedia = new FakeTable(() => ({
    licenceStatus: 'pending_confirmation',
    sortOrder: 0,
    altEn: null,
    altAr: null,
    createdAt: new Date(),
  }));
  const request = new FakeTable(
    () => ({
      parentRequestId: null,
      status: 'draft',
      visibility: 'private',
      currentStep: 1,
      submittedAt: null,
      publishedAt: null,
      closedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    ['requestNumber'],
  );
  const farmListingDetail = new FakeTable(
    () => ({
      currency: 'EGP',
      askingPrice: null,
      annualRentPerFeddan: null,
      statedSalePricePerFeddan: null,
      availability: null,
      listingDescription: null,
      highlights: null,
      extraDetails: null,
    }),
    ['requestId', 'slug'],
  );
  const requestStatusHistory = new FakeTable(() => ({ fromStatus: null, reason: null, createdAt: new Date() }));
  const requestReview = new FakeTable(() => ({ comment: null, createdAt: new Date() }));
  const requestStaffAssignment = new FakeTable(
    () => ({ assignedAt: new Date(), updatedAt: new Date() }),
    [],
    [['requestId', 'assignmentType']],
  );
  const auditLog = new FakeTable(() => ({
    actorUserId: null,
    changes: null,
    ipAddress: null,
    createdAt: new Date(),
  }));
  const savedItem = new FakeTable(
    () => ({
      farmId: null,
      opportunityRequestId: null,
      listingRequestId: null,
      savedAt: new Date(),
    }),
    [],
    [
      ['userId', 'targetKey'],
      ['userId', 'listingRequestId'],
    ],
  );
  const agriculturalFacility = new FakeTable(() => ({
    description: null,
    governorate: null,
    areaName: null,
    latitude: null,
    longitude: null,
    capacityDetails: null,
    services: null,
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }));
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

  const tables = {
    user,
    otpVerification,
    userSession,
    staffMembership,
    farmRelationship,
    userSessionToken,
    farm,
    farmCropType,
    agriculturalFacility,
    farmMedia,
    facilityMedia,
    request,
    farmListingDetail,
    requestStatusHistory,
    requestReview,
    requestStaffAssignment,
    auditLog,
    savedItem,
  };
  /** Interactive transaction: all-or-nothing over every table (the callback gets the same fake as 	x). */
  /** Row locks used by media uploads (`SELECT ... FOR UPDATE`). Enough for the in-memory API; it does not emulate InnoDB. */
  const $queryRaw = (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]> => {
    const sql = strings.join(' ');
    if (sql.includes('agricultural_facilities')) {
      const [id, farmId] = values as [bigint, bigint];
      const row = agriculturalFacility.rows.find((r) => r.id === id && r.farmId === farmId && r.deletedAt == null);
      return Promise.resolve(row ? [{ id: row.id }] : []);
    }
    if (sql.includes('FROM farms')) {
      const [id] = values as [bigint];
      const row = farm.rows.find((r) => r.id === id && r.deletedAt == null);
      return Promise.resolve(row ? [{ id: row.id }] : []);
    }
    if (sql.includes('whole-pound-listing-ids')) {
      return Promise.resolve(
        request.rows.flatMap((row) => {
          if (row.requestType !== 'farmListing' || row.status !== 'published') return [];
          const detail = farmListingDetail.rows.find((item) => item.requestId === row.id);
          const price = detail?.listingType === 'rent' ? detail.annualRentPerFeddan : detail?.askingPrice;
          return wholePounds(price) ? [] : [{ id: row.id }];
        }),
      );
    }
    return Promise.reject(new Error('Unsupported raw SQL in fake'));
  };

  const $transaction = async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
    const saved = Object.values(tables).map((t) => t.snapshot());
    try {
      return await fn(api);
    } catch (error) {
      Object.values(tables).forEach((t, i) => t.restore(saved[i]));
      throw error;
    }
  };

  type QueryArgs = Args & { select?: Record<string, unknown> };

  const relatedRow = (kind: string, row: Row): Row | null => {
    if (kind === 'farm') return farm.rows.find((item) => item.id === row.farmId) ?? null;
    if (kind === 'listingDetail') return farmListingDetail.rows.find((item) => item.requestId === row.id) ?? null;
    return null;
  };

  const matchRelation = (row: Row, kind: string, expected: unknown): boolean => {
    if (!isOperator(expected)) return false;
    const related = relatedRow(kind, row);
    if ('isNot' in expected && expected.isNot === null) return related !== null;
    const filter = 'is' in expected ? expected.is : expected;
    if (filter === null) return related === null;
    if (!related || !isOperator(filter)) return false;
    return matches(related, filter);
  };

  const matchRequest = (row: Row, where: Where = {}): boolean => {
    const and = where.AND;
    const or = where.OR;
    if (Array.isArray(and) && !and.every((part) => isOperator(part) && matchRequest(row, part))) return false;
    if (Array.isArray(or) && !or.some((part) => isOperator(part) && matchRequest(row, part))) return false;
    const rest: Where = {};
    for (const [key, value] of Object.entries(where)) {
      if (key === 'AND' || key === 'OR') continue;
      if (key === 'farm' || key === 'listingDetail') {
        if (!matchRelation(row, key, value)) return false;
        continue;
      }
      rest[key] = value;
    }
    return matches(row, rest);
  };

  const project = (row: Row, select: Record<string, unknown> | undefined): Row => {
    if (!select) return { ...row };
    const out: Row = {};
    for (const [key, spec] of Object.entries(select)) {
      if (spec === true) out[key] = row[key];
      else if (isOperator(spec) && isOperator(spec.select) && (key === 'farm' || key === 'listingDetail')) {
        const related = relatedRow(key, row);
        out[key] = related ? project(related, spec.select) : null;
      }
    }
    return out;
  };

  const orderValue = (row: Row, clause: Record<string, unknown>): { value: number | bigint | string; dir: 'asc' | 'desc' } => {
    const [key, dir] = Object.entries(clause)[0];
    if (isOperator(dir)) {
      const [field, order] = Object.entries(dir)[0];
      const raw = relatedRow(key, row)?.[field];
      const numeric = asNumber(raw);
      return { value: numeric ?? comparable(raw), dir: order === 'desc' ? 'desc' : 'asc' };
    }
    const raw = row[key];
    const numeric = asNumber(raw);
    return { value: numeric ?? comparable(raw), dir: dir === 'desc' ? 'desc' : 'asc' };
  };

  const requestQuery = (args: QueryArgs = {}): Row[] => {
    const order = args.orderBy === undefined ? [] : Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
    const sorted = request.rows.filter((row) => matchRequest(row, args.where)).sort((left, right) => {
      for (const clause of order) {
        const a = orderValue(left, clause);
        const b = orderValue(right, clause);
        if (a.value === b.value) continue;
        return (a.value < b.value ? -1 : 1) * (a.dir === 'asc' ? 1 : -1);
      }
      return 0;
    });
    const start = args.skip ?? 0;
    const page = args.take === undefined ? sorted.slice(start) : sorted.slice(start, start + args.take);
    return page.map((row) => project(row, args.select));
  };

  const relational = (args: QueryArgs | undefined): boolean => {
    if (!args) return false;
    const where = args.where ?? {};
    if ('farm' in where || 'listingDetail' in where || 'AND' in where || 'OR' in where) return true;
    if (args.select && ('farm' in args.select || 'listingDetail' in args.select)) return true;
    const order = args.orderBy === undefined ? [] : Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
    return order.some((clause) => isOperator(Object.values(clause)[0]));
  };

  const findMany = request.findMany.bind(request);
  const findFirst = request.findFirst.bind(request);
  const count = request.count.bind(request);
  request.findMany = (args) => (relational(args) ? Promise.resolve(requestQuery(args)) : findMany(args));
  request.findFirst = (args) =>
    relational(args) ? Promise.resolve(requestQuery({ ...args, take: 1 })[0] ?? null) : findFirst(args);
  request.count = (args) =>
    relational(args) ? Promise.resolve(request.rows.filter((row) => matchRequest(row, args?.where)).length) : count(args);

  const api = {
    user,
    otpVerification,
    userSession,
    staffMembership,
    farmRelationship,
    userSessionToken,
    farm,
    farmCropType,
    agriculturalFacility,
    farmMedia,
    facilityMedia,
    request,
    farmListingDetail,
    requestStatusHistory,
    requestReview,
    requestStaffAssignment,
    auditLog,
    savedItem,
    $transaction,
    $executeRaw,
    $queryRaw,
    $disconnect: () => Promise.resolve(),
  };
  return api;
}

export type FakePrisma = ReturnType<typeof createFakePrisma>;
