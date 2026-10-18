import { randomInt } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../../app.module';
import { configureApp } from '../../common/app-setup';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../auth/token.service';

const describeDb = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;

describeDb('Communication on real MySQL', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let buyer: { id: bigint; token: string };
  let agent: { id: bigint; token: string };
  let proposalId: bigint;

  const http = () => request(app.getHttpServer());
  const as = (u: { token: string }) => ({
    post: (path: string, body: object = {}) => http().post(path).set('Authorization', `Bearer ${u.token}`).send(body),
  });

  async function makeUser(mobile: string, role?: 'caseAgent'): Promise<{ id: bigint; token: string }> {
    const now = new Date();
    const user = await prisma.user.create({
      data: { mobileE164: mobile, fullName: 'User', mobileVerifiedAt: now, createdAt: now },
    });
    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionTokenHash: `h-${mobile}`,
        expiresAt: new Date(now.getTime() + 3_600_000),
        createdAt: now,
      },
    });
    if (role) {
      await prisma.staffMembership.create({
        data: { userId: user.id, staffRole: role, status: 'active', createdAt: now },
      });
    }
    return { id: user.id, token: app.get(TokenService).signAccessToken(user.id, session.id) };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    buyer = await makeUser(`+2016${String(randomInt(0, 99_999_999)).padStart(8, '0')}`);
    agent = await makeUser(`+2016${String(randomInt(0, 99_999_999)).padStart(8, '0')}`, 'caseAgent');
    const farm = await prisma.farm.create({
      data: {
        name: 'Comm MySQL Farm',
        farmType: 'mixed',
        areaFeddan: 12,
        governorate: 'Giza',
        createdBy: buyer.id,
      },
    });
    const proposal = await prisma.request.create({
      data: {
        requestNumber: `PP${String(randomInt(1000, 9999))}`,
        requestType: 'farmPurchaseProposal',
        status: 'submitted',
        createdBy: buyer.id,
        farmId: farm.id,
        visibility: 'private',
      },
    });
    proposalId = proposal.id;
    await prisma.requestStaffAssignment.create({
      data: {
        requestId: proposalId,
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

  it('opens a communication case when a case agent is assigned', async () => {
    const res = await as(buyer).post('/api/v1/communication/cases', { requestId: proposalId.toString() }).expect(201);
    const caseId = BigInt((res.body as { id: string }).id);
    const count = await prisma.communicationCase.count({ where: { id: caseId } });
    expect(count).toBe(1);
  });
});
