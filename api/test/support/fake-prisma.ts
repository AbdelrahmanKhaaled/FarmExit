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
    if (actual === undefined && isOperator(expected)) {
      return matches(row, expected);
    }
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

  findUniqueOrThrow(args: Args & { include?: Record<string, boolean> }): Promise<Row> {
    return this.findUnique(args).then((row) => {
      if (!row) {
        return Promise.reject(Object.assign(new Error('No record found for query'), { code: 'P2025' }));
      }
      return row;
    });
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

  groupBy({
    by,
    where,
  }: {
    by: string[];
    where?: Where;
    _count?: { _all?: boolean };
  }): Promise<Row[]> {
    const filtered = this.rows.filter((r) => matches(r, where));
    const map = new Map<string, { row: Row; count: number }>();
    for (const r of filtered) {
      const key = by.map((b) => String(r[b])).join('\0');
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else {
        const groupRow: Row = { _count: { _all: 0 } };
        for (const b of by) groupRow[b] = r[b];
        map.set(key, { row: groupRow, count: 1 });
      }
    }
    return Promise.resolve(
      [...map.values()].map(({ row, count }) => {
        row._count = { _all: count };
        return { ...row };
      }),
    );
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

  upsert({ where, create, update }: { where: Where; create: Row; update: Row }): Promise<Row> {
    const target = this.rows.find((r) => matches(r, where));
    if (!target) return this.create({ data: { ...create, ...where } });
    return this.update({ where, data: update });
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
  const partnershipDetail = new FakeTable(() => ({
    objective: null,
    description: null,
    acceptedPartnerTypes: null,
    partnerBackground: null,
    lookingFor: null,
    contributionSought: null,
    contributionDetails: null,
    currentTeam: null,
    operations: null,
    salesChannel: null,
    extraInformation: null,
    ownerDocumentsRequired: null,
  }));
  const communicationCase = new FakeTable(() => ({
    status: 'open',
    createdAt: new Date(),
    closedAt: null,
  }));
  const conversation = new FakeTable(
    () => ({
      status: 'open',
      createdAt: new Date(),
      closedAt: null,
    }),
    [],
    [['caseId', 'externalUserId']],
  );
  const message = new FakeTable(() => ({
    body: null,
    sentAt: new Date(),
    editedAt: null,
    deletedAt: null,
  }));
  const messageRelay = new FakeTable(() => ({
    relayNote: null,
    relayedAt: new Date(),
  }));
  const farmManagementDetail = new FakeTable(() => ({
    professionalNeed: 'farmManager',
    managementTypes: null,
    term: null,
    currentTeam: null,
    currentSituation: null,
    challenges: null,
    goals: null,
    outcomes: null,
    responsibilities: null,
    experienceLevel: null,
    cropExpertise: null,
    onSitePresence: null,
    teamLeadership: null,
    resourcesAndFacilities: null,
    additionalInformation: null,
  }));
  const professionalVerificationDetail = new FakeTable(() => ({
    professionalCapabilityId: 1n,
    profileSnapshot: {},
    verificationSummary: null,
    createdAt: new Date(),
  }));
  const professionalProfile = new FakeTable(
    () => ({
      headline: null,
      bio: null,
      baseGovernorate: null,
      yearsExperience: null,
      experienceSummary: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    ['userId'],
  );
  const professionalCapability = new FakeTable(() => ({
    professionalProfileId: 1n,
    professionalType: 'farmManager',
    verificationStatus: 'verificationRequired',
    verifiedAt: null,
    notApprovedReason: null,
  }));
  const requestApplicationDetail = new FakeTable(() => ({
    applicantKind: null,
    professionalCapabilityId: null,
    applicationMessage: null,
    whyGoodFit: null,
    relevantExperience: null,
    approach: null,
    workingStyle: null,
    additionalInformation: null,
    companyName: null,
    companyRegistrationNumber: null,
    companyContactName: null,
    companyContactRole: null,
    companySector: null,
    proposalDetails: null,
  }));
  const requestStatusHistory = new FakeTable(() => ({ fromStatus: null, reason: null, createdAt: new Date() }));
  const requestReview = new FakeTable(() => ({ comment: null, createdAt: new Date() }));
  const requestStaffAssignment = new FakeTable(
    () => ({ assignedAt: new Date(), updatedAt: new Date() }),
    [],
    [['requestId', 'assignmentType']],
  );
  const requestForwarding = new FakeTable(
    () => ({
      status: 'sent',
      ownerDecision: null,
      decisionReason: null,
      decidedBy: null,
      createdAt: new Date(),
      decidedAt: null,
    }),
    [],
    [['requestId', 'recipientUserId']],
  );
  const auditLog = new FakeTable(() => ({
    actorUserId: null,
    changes: null,
    ipAddress: null,
    createdAt: new Date(),
  }));
  const farmSaleTerms = new FakeTable(
    () => ({
      saleMode: 'standardCash',
      acceptsCashProposals: true,
      acceptsInstallmentProposals: false,
      acceptsExchangeProposals: false,
      exchangePreferenceScope: 'any',
      updatedAt: new Date(),
    }),
    ['listingRequestId'],
  );
  const farmExchangePreference = new FakeTable(() => ({ createdAt: new Date() }), [], [['listingRequestId', 'assetType']]);
  const farmPurchaseProposalDetail = new FakeTable(
    () => ({
      proposedTotalValue: null,
      currency: 'EGP',
      requestedSharePercent: null,
      proposalNotes: null,
      submittedAt: null,
    }),
    ['requestId'],
  );
  const farmPurchaseProposalComponent = new FakeTable(() => ({
    proposedValue: null,
    currency: 'EGP',
    assetType: null,
    assetDescription: null,
    installmentCount: null,
    installmentInterval: null,
    componentNotes: null,
    createdAt: new Date(),
  }));
  const coPurchaseGroup = new FakeTable(() => ({
    listingAskingPriceSnapshot: null,
    groupStatus: 'collectingInterest',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    closedAt: null,
  }));
  const coPurchaseGroupMember = new FakeTable(
    () => ({
      proposedContributionValue: null,
      memberStatus: 'candidate',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    [],
    [['groupId', 'buyerProposalRequestId']],
  );
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
  const requestDocument = new FakeTable(() => ({
    requestId: null,
    storageKey: 'fake-doc',
    originalFilename: 'doc.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 1024,
    status: 'uploaded',
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  const farmEvaluationCheck = new FakeTable(
    () => ({
      evidenceDocumentId: null,
      reviewerNotes: null,
      reviewedAt: null,
    }),
    [],
    [['evaluationId', 'checkKey']],
  );
  const farmEvaluationTable = new FakeTable(() => ({
    listingRequestId: null,
    approvedBy: null,
    scoreValue: null,
    scoreMax: null,
    methodologyName: null,
    methodologyVersion: null,
    reviewScopeEn: null,
    reviewScopeAr: null,
    publicSummaryEn: null,
    publicSummaryAr: null,
    internalNotes: null,
    status: 'draft',
    reviewedAt: null,
    approvedAt: null,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  const attachEvaluationRelations = async (ev: Row, include?: Record<string, boolean>): Promise<Row> => {
    if (!include) return ev;
    const out = { ...ev };
    if (include.reviewer) {
      out.reviewer = await user.findFirst({ where: { id: ev.reviewedBy } });
    }
    if (include.approver) {
      out.approver = ev.approvedBy ? await user.findFirst({ where: { id: ev.approvedBy } }) : null;
    }
    if (include.checks) {
      out.checks = await farmEvaluationCheck.findMany({ where: { evaluationId: ev.id } });
    }
    return out;
  };
  const farmEvaluation = Object.assign(farmEvaluationTable, {
    create: async ({ data, include }: { data: Row; include?: Record<string, boolean> }): Promise<Row> => {
      const { checks, ...fields } = data;
      const created = await FakeTable.prototype.create.call(farmEvaluationTable, { data: fields });
      if (checks && typeof checks === 'object' && 'create' in checks && Array.isArray((checks as Record<string, unknown>).create)) {
        for (const c of (checks as { create: Row[] }).create) {
          await farmEvaluationCheck.create({ data: { ...c, evaluationId: created.id } });
        }
      }
      return attachEvaluationRelations(created, include);
    },
    findFirst: async (args: Args & { include?: Record<string, boolean> }): Promise<Row | null> => {
      const row = await FakeTable.prototype.findFirst.call(farmEvaluationTable, args);
      return row ? attachEvaluationRelations(row, args?.include) : null;
    },
    findMany: async (args: Args & { include?: Record<string, boolean> }): Promise<Row[]> => {
      const rows = await FakeTable.prototype.findMany.call(farmEvaluationTable, args);
      if (!args?.include) return rows;
      return Promise.all(rows.map((r) => attachEvaluationRelations(r, args.include)));
    },
    update: async (args: { where: Where; data: Row; include?: Record<string, boolean> }): Promise<Row> => {
      const updated = await FakeTable.prototype.update.call(farmEvaluationTable, args);
      return attachEvaluationRelations(updated, args.include);
    },
  });
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
  const adminCredential = new FakeTable(
    () => ({
      isActive: true,
      mustChangePassword: true,
      passwordChangedAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    ['userId', 'email'],
  );
  const farmRelationship = new FakeTable(() => ({
    relationshipStatus: 'active',
    startsAt: null,
    endsAt: null,
    createdAt: new Date(),
  }));
  const otpVerification = new FakeTable(() => ({ userId: null, attempts: 0, consumedAt: null }));
  const sessionTable = new FakeTable(() => ({
    authAudience: 'website',
    deviceName: null,
    userAgent: null,
    ipAddress: null,
    revokedAt: null,
  }));

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

  const credentialFindUnique = adminCredential.findUnique.bind(adminCredential);
  adminCredential.findUnique = async (args: Args & { include?: Record<string, boolean> }) => {
    const row = await credentialFindUnique(args);
    if (!row || !args.include?.user) return row;
    const owner = await user.findFirst({ where: { id: row.userId } });
    if (!owner) return { ...row, user: null };
    const includeUser = args.include.user as { include?: { staffMemberships?: boolean } };
    if (includeUser.include?.staffMemberships) {
      const memberships = staffMembership.rows.filter((m) => m.userId === owner.id);
      return { ...row, user: { ...owner, staffMemberships: memberships } };
    }
    return { ...row, user: owner };
  };

  const tables = {
    user,
    otpVerification,
    userSession,
    staffMembership,
    adminCredential,
    farmRelationship,
    userSessionToken,
    farm,
    farmCropType,
    agriculturalFacility,
    farmMedia,
    facilityMedia,
    request,
    farmListingDetail,
    partnershipDetail,
    farmManagementDetail,
    professionalProfile,
    professionalCapability,
    professionalVerificationDetail,
    requestApplicationDetail,
    communicationCase,
    conversation,
    message,
    messageRelay,
    requestStatusHistory,
    requestReview,
    requestStaffAssignment,
    requestForwarding,
    auditLog,
    savedItem,
    farmSaleTerms,
    farmExchangePreference,
    farmPurchaseProposalDetail,
    farmPurchaseProposalComponent,
    coPurchaseGroup,
    coPurchaseGroupMember,
    requestDocument,
    farmEvaluation,
    farmEvaluationCheck,
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

  const $queryRawUnsafe = (_sql: string, ..._values: unknown[]): Promise<unknown[]> => {
    return Promise.resolve([]);
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

  const attachMessageRow = (row: Row | null, include?: Record<string, boolean>): Row | null => {
    if (!row) return null;
    const out = { ...row };
    if (include?.conversation) {
      out.conversation = conversation.rows.find((item) => item.id === row.conversationId) ?? null;
    }
    if (include?.relayedAs) {
      out.relayedAs = messageRelay.rows.find((item) => item.relayedMessageId === row.id) ?? null;
    }
    return out;
  };

  type IncludeArgs = Args & { include?: Record<string, boolean> };

  const messageFindUnique = message.findUnique.bind(message);
  const messageFindFirst = message.findFirst.bind(message);
  const messageFindMany = message.findMany.bind(message);
  message.findUnique = (args: IncludeArgs) =>
    messageFindUnique(args).then((row) => attachMessageRow(row, args.include));
  message.findFirst = (args: IncludeArgs) =>
    messageFindFirst(args).then((row) => attachMessageRow(row, args.include));
  message.findMany = (args: IncludeArgs) =>
    messageFindMany(args).then((rows) => rows.map((row) => attachMessageRow(row, args.include) as Row));

  const attachProfessionalProfile = (row: Row | null, include?: Record<string, boolean>): Row | null => {
    if (!row) return null;
    const out = { ...row };
    if (include?.capabilities) {
      const caps = professionalCapability.rows
        .filter((item) => item.professionalProfileId === row.id)
        .map((item) => ({ ...item, expertise: [], serviceAreas: [] }))
        .sort((a, b) => String((a as Row).professionalType).localeCompare(String((b as Row).professionalType)));
      out.capabilities = caps;
    }
    return out;
  };

  const profileFindUnique = professionalProfile.findUnique.bind(professionalProfile);
  const profileFindUniqueOrThrow = professionalProfile.findUniqueOrThrow.bind(professionalProfile);
  professionalProfile.findUnique = (args: IncludeArgs) =>
    profileFindUnique(args).then((row) => attachProfessionalProfile(row, args.include));
  professionalProfile.findUniqueOrThrow = (args: IncludeArgs) =>
    profileFindUniqueOrThrow(args).then((row) => attachProfessionalProfile(row, args.include) as Row);

  const attachCapabilityRow = (row: Row | null, include?: Record<string, boolean>): Row | null => {
    if (!row) return null;
    const out = { ...row };
    if (include?.profile) {
      out.profile = professionalProfile.rows.find((item) => item.id === row.professionalProfileId) ?? null;
    }
    if (include?.expertise) out.expertise = [];
    if (include?.serviceAreas) out.serviceAreas = [];
    return out;
  };

  const capabilityMatchesWhere = (row: Row, where: Where = {}): boolean => {
    const profileFilter = where.profile;
    const rest = { ...where };
    delete rest.profile;
    if (!matches(row, rest)) return false;
    if (profileFilter !== undefined) {
      const profileRow = professionalProfile.rows.find((item) => item.id === row.professionalProfileId);
      if (!profileRow || !matches(profileRow, profileFilter as Where)) return false;
    }
    return true;
  };

  const capabilityFindUnique = professionalCapability.findUnique.bind(professionalCapability);
  professionalCapability.findFirst = (args: IncludeArgs = {}) => {
    const found =
      professionalCapability.rows.filter((row) => capabilityMatchesWhere(row, args.where))[0] ?? null;
    return Promise.resolve(attachCapabilityRow(found ? { ...found } : null, args.include));
  };
  professionalCapability.findUnique = (args: IncludeArgs) =>
    capabilityFindUnique(args).then((row) => attachCapabilityRow(row, args.include));

  const verificationDetailFindUnique = professionalVerificationDetail.findUnique.bind(professionalVerificationDetail);
  professionalVerificationDetail.findUnique = (args: IncludeArgs) =>
    verificationDetailFindUnique(args).then((row) => {
      if (!row) return null;
      const out = { ...row };
      if (args.include?.capability) {
        out.capability =
          professionalCapability.rows.find((item) => item.id === row.professionalCapabilityId) ?? null;
      }
      return out;
    });

  const api = {
    user,
    otpVerification,
    userSession,
    staffMembership,
    adminCredential,
    farmRelationship,
    userSessionToken,
    farm,
    farmCropType,
    agriculturalFacility,
    farmMedia,
    facilityMedia,
    request,
    farmListingDetail,
    partnershipDetail,
    farmManagementDetail,
    professionalProfile,
    professionalCapability,
    professionalVerificationDetail,
    requestApplicationDetail,
    communicationCase,
    conversation,
    message,
    messageRelay,
    requestStatusHistory,
    requestReview,
    requestStaffAssignment,
    requestForwarding,
    auditLog,
    savedItem,
    farmSaleTerms,
    farmExchangePreference,
    farmPurchaseProposalDetail,
    farmPurchaseProposalComponent,
    coPurchaseGroup,
    coPurchaseGroupMember,
    requestDocument,
    farmEvaluation,
    farmEvaluationCheck,
    $transaction,
    $executeRaw,
    $queryRaw,
    $queryRawUnsafe,
    $disconnect: () => Promise.resolve(),
  };
  return api;
}

export type FakePrisma = ReturnType<typeof createFakePrisma>;
