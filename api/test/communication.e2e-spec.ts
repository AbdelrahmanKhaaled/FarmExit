import { createHmac } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/app-setup';
import { SMS_PROVIDER } from '../src/modules/auth/sms/sms-provider';
import { DevelopmentSmsProvider } from '../src/modules/auth/sms/development-sms.provider';
import { PrismaService } from '../src/prisma/prisma.service';
import { createFakePrisma, type FakePrisma } from './support/fake-prisma';

describe('Mediated communication E2E', () => {
  let app: INestApplication<App>;
  let fakePrisma: FakePrisma;
  let jwtSecret: string;
  let buyer: { id: bigint; token: string };
  let owner: { id: bigint; token: string };
  let agent: { id: bigint; token: string };
  let other: { id: bigint; token: string };
  let proposalRequestId: bigint;
  let caseId: bigint;

  const http = () => request(app.getHttpServer());
  const as = (u: { token: string }) => ({
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', `Bearer ${u.token}`).send(body),
    get: (path: string) => http().get(path).set('Authorization', `Bearer ${u.token}`),
    patch: (path: string, body: object = {}) => http().patch(path).set('Authorization', `Bearer ${u.token}`).send(body),
  });

  function signToken(userId: bigint, sessionId: bigint): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(
      JSON.stringify({ sub: userId.toString(), sid: sessionId.toString(), iss: 'farmexit-api', iat: now, exp: now + 3600 }),
    ).toString('base64url');
    const signature = createHmac('sha256', jwtSecret).update(`${header}.${payload}`).digest('base64url');
    return `${header}.${payload}.${signature}`;
  }

  async function createUser(
    mobileE164: string,
    fullName: string,
    role?: 'caseAgent',
  ): Promise<{ id: bigint; token: string }> {
    const user = await fakePrisma.user.create({
      data: { mobileE164, fullName, accountStatus: 'active', mobileVerifiedAt: new Date() },
    });
    const session = await fakePrisma.userSession.create({
      data: { userId: user.id, sessionTokenHash: 'hash', expiresAt: new Date(Date.now() + 3_600_000) },
    });
    if (role) {
      await fakePrisma.staffMembership.create({ data: { userId: user.id, staffRole: role, status: 'active' } });
    }
    return { id: user.id as bigint, token: signToken(user.id as bigint, session.id as bigint) };
  }

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    fakePrisma = createFakePrisma();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .overrideProvider(SMS_PROVIDER)
      .useClass(DevelopmentSmsProvider)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    jwtSecret = app.get(ConfigService).get<string>('JWT_ACCESS_SECRET', { infer: true })!;

    buyer = await createUser('+201090000101', 'Buyer');
    owner = await createUser('+201090000102', 'Owner');
    agent = await createUser('+201090000103', 'Agent', 'caseAgent');
    other = await createUser('+201090000104', 'Other');

    const farm = await fakePrisma.farm.create({
      data: { name: 'Comm Farm', farmType: 'fruit', areaFeddan: 10, governorate: 'Cairo', createdBy: owner.id },
    });
    await fakePrisma.farmRelationship.create({
      data: { farmId: farm.id, userId: owner.id, relationshipRole: 'owner', relationshipStatus: 'active' },
    });
    const proposal = await fakePrisma.request.create({
      data: {
        requestNumber: 'PP-COMM-1',
        requestType: 'farmPurchaseProposal',
        status: 'submitted',
        createdBy: buyer.id,
        farmId: farm.id,
        visibility: 'private',
      },
    });
    proposalRequestId = proposal.id as bigint;
    await fakePrisma.requestStaffAssignment.create({
      data: {
        requestId: proposalRequestId,
        assignedStaffId: agent.id,
        assignedByUserId: agent.id,
        assignmentType: 'caseAgent',
        assignedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('opens a case for the proposal buyer and sends a message to FarmExit', async () => {
    const opened = await as(buyer)
      .post('/api/v1/communication/cases', { requestId: proposalRequestId.toString() })
      .expect(201);
    caseId = BigInt((opened.body as { id: string }).id);
    await as(buyer)
      .post(`/api/v1/communication/cases/${caseId}/messages`, { body: 'Question about the farm visit' })
      .expect(201);
    const list = await as(buyer).get(`/api/v1/communication/cases/${caseId}/messages`).expect(200);
    expect((list.body as { items: unknown[] }).items).toHaveLength(1);
  });

  it('isolates another user from the buyer case', async () => {
    await as(other).get(`/api/v1/communication/cases/${caseId}`).expect(403);
  });

  it('rejects staff relay to arbitrary external users', async () => {
    const buyerMsgs = await fakePrisma.message.findMany({});
    const sourceId = buyerMsgs[0]?.id;
    await as(agent)
      .post(`/api/v1/staff/communication/cases/${caseId}/relay`, {
        sourceMessageId: String(sourceId),
        targetExternalUserId: other.id.toString(),
        body: 'Should not deliver',
      })
      .expect(403);
  });

  it('relays mediated content to the farm owner without exposing buyer conversation', async () => {
    const buyerMsgs = await fakePrisma.message.findMany({});
    const sourceId = buyerMsgs[0]?.id;
    const relay = await as(agent)
      .post(`/api/v1/staff/communication/cases/${caseId}/relay`, {
        sourceMessageId: String(sourceId),
        targetExternalUserId: owner.id.toString(),
        body: 'FarmExit: A buyer asked about arranging a visit.',
      })
      .expect(201);
    expect((relay.body as { isRelayedCopy: boolean }).isRelayedCopy).toBe(true);
    const ownerMsgs = await as(owner).get(`/api/v1/communication/cases/${caseId}/messages`).expect(200);
    expect((ownerMsgs.body as { items: unknown[] }).items).toHaveLength(1);
    const ownerView = await as(owner).get(`/api/v1/communication/cases/${caseId}/messages`).expect(200);
    const bodies = (ownerView.body as { items: { body: string }[] }).items.map((m) => m.body);
    expect(bodies.join('')).not.toContain('Question about the farm visit');
  });
});
