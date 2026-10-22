const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PEOPLE } = require('./seed-client-demo.cjs');
const root = path.resolve(__dirname, '..');
const load = (module) => require(path.join(root, 'dist', module));

function demoPdf() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  const stream = 'BT /F1 14 Tf 60 730 Td ([DEMO] Synthetic supporting document. No real customer evidence.) Tj ET';
  objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  let text = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(text));
    text += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(text);
  text += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => String(offset).padStart(10, '0') + ' 00000 n ')
    .join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(text);
}

async function verify(context, fixtures) {
  const { NestFactory } = require('@nestjs/core');
  const { ConfigService } = require('@nestjs/config');
  const { AppModule } = load('app.module');
  const { configureApp } = load('common/app-setup');
  const { FarmExitSocketIoAdapter } = load('common/socket-io.adapter');
  const { PrismaService } = load('prisma/prisma.service');
  const { SMS_PROVIDER } = load('modules/auth/sms/sms-provider');
  const prisma = context.get(PrismaService);
  const evidence = [];
  const sessions = [];
  const record = (scenario, details) => {
    const row = { scenario, status: 'LIVE VERIFIED', ...details };
    evidence.push(row);
    console.log(JSON.stringify(row));
  };
  const app = await NestFactory.create(AppModule, { logger: false });
  const config = app.get(ConfigService);
  app.useWebSocketAdapter(new FarmExitSocketIoAdapter(app, config.get('SOCKET_IO_PATH')));
  configureApp(app);
  // Explicitly use only the authorized API port. Refuse rather than replace an existing server.
  try {
    await app.listen(4001, '127.0.0.1');
  } catch (error) {
    await app.close();
    throw error;
  }
  const base = 'http://127.0.0.1:4001/api/v1';
  async function call(method, route, token, body, expected = 200) {
    const multipart = body instanceof FormData;
    const response = await fetch(base + route, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body && !multipart ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? (multipart ? body : JSON.stringify(body)) : undefined,
    });
    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    if (response.status !== expected) {
      const error = new Error(
        `${method} ${route}: expected ${expected}, got ${response.status}; ${JSON.stringify(data)}`,
      );
      error.status = response.status;
      error.responseData = data;
      throw error;
    }
    return data;
  }
  async function website(key) {
    const person = PEOPLE.find(([name]) => name === key);
    try {
      await call('POST', '/auth/otp/request', null, { mobile: person[1] });
    } catch (error) {
      const delay = error.responseData?.retryAfterSeconds;
      if (error.status !== 429 || !(delay > 0 && delay <= 60)) throw error;
      console.log('Respecting OTP resend cooldown for isolated fixture:', { seconds: delay });
      await new Promise((resolve) => setTimeout(resolve, (delay + 0.1) * 1000));
      await call('POST', '/auth/otp/request', null, { mobile: person[1] });
    }
    const sms = app.get(SMS_PROVIDER);
    assert.equal(typeof sms.lastCodeFor, 'function', 'Approved development SMS adapter is required.');
    const code = sms.lastCodeFor(person[1]);
    assert(code, 'Development SMS provider did not receive the OTP.');
    const result = await call('POST', '/auth/otp/verify', null, { mobile: person[1], code });
    sessions.push({ token: result.accessToken, audience: 'website' });
    assert(result.accessToken);
    return result.accessToken;
  }
  async function dashboard(key) {
    let password = fixtures.secrets.get(key);
    if (!password) {
      // Only these isolated synthetic identities may receive a fresh in-memory verification password.
      const person = PEOPLE.find(([name]) => name === key);
      const user = await prisma.user.findUniqueOrThrow({ where: { id: fixtures.ids[key] } });
      assert.equal(user.fullName, person[2]);
      assert.equal(user.mobileE164, person[1]);
      assert.equal(user.email, `client-demo-${key}@farmexit.invalid`);
      password = require('node:crypto').randomBytes(32).toString('base64url');
      await prisma.adminCredential.update({
        where: { userId: user.id },
        data: { passwordHash: await require('argon2').hash(password) },
      });
      await prisma.auditLog.create({
        data: {
          actorUserId: fixtures.ids.reviewer,
          entityType: 'user',
          entityId: user.id,
          action: 'client_demo_verification_credential_rotated',
          changes: { synthetic: true },
        },
      });
    }
    const result = await call('POST', '/admin-auth/login', null, {
      email: `client-demo-${key}@farmexit.invalid`,
      password,
    });
    sessions.push({ token: result.accessToken, audience: 'dashboard' });
    return result.accessToken;
  }
  try {
    for (const kind of ['management', 'partnerships']) {
      const listing = await call('GET', '/public/' + kind);
      assert(!listing.items.some((row) => fixtures.requests.some((fixture) => fixture.id === row.id)));
      assert(!listing.items.some((row) => row.id === '753'));
      record(`${kind}: approved-private fixtures excluded from public API`, { total: listing.total, fixtureCount: 3 });
      await call('GET', '/public/' + kind + '/' + fixtures.requests[0].id, null, null, 404);
      evidence.push({
        scenario: `${kind}: public detail/navigation`,
        status: 'BLOCKED',
        cause: 'No public detail API or Website detail route exists; no approved publication workflow.',
      });
    }
    await call('GET', '/partnership-applications', null, null, 401);
    const owner = await website('owner');
    const applicant = await website('applicant');
    const outsider = await website('outsider');
    const reviewerWebsite = await website('reviewer');
    const reviewer = await dashboard('reviewer');
    const agent = await dashboard('agent');
    record('OTP Website login and Dashboard password login', { websiteAccounts: 4, dashboardAccounts: 2 });
    await call('GET', '/admin-auth/me', applicant, null, 401);
    await call('POST', '/staff/communication/realtime-ticket', reviewerWebsite, {}, 401);
    record('Dashboard identity and realtime ticket reject Website audience', {});
    const mgt = fixtures.requests.find((row) => row.reference === 'DEMO-MP-MGT-01');
    const part = fixtures.requests.find((row) => row.reference === 'DEMO-MP-PART-01');
    await call('GET', '/farm-management-requests/' + mgt.id, owner);
    await call('GET', '/farm-management-requests/' + mgt.id, outsider, null, 404);
    const tracked = await call('GET', '/farm-management-requests', owner);
    assert(tracked.items.some((row) => row.id === mgt.id && row.status === 'approved'));
    await call('GET', '/staff/farm-management-requests/' + mgt.id, reviewer);
    record('Management owner tracking, refresh and approved staff detail', { requestId: mgt.id });
    evidence.push({
      scenario: 'Management opportunity apply',
      status: 'BLOCKED',
      cause: 'No management application/proposal API or corresponding Website application form.',
    });
    await call(
      'POST',
      '/partnership-applications',
      owner,
      { parentPartnershipRequestId: part.id, applicantKind: 'individual' },
      409,
    );
    let application = await prisma.request.findFirst({
      where: {
        requestType: 'partnershipApplication',
        createdBy: fixtures.ids.applicant,
        parentRequestId: BigInt(part.id),
      },
    });
    let applicationId;
    if (!application) {
      const draft = await call(
        'POST',
        '/partnership-applications',
        applicant,
        { parentPartnershipRequestId: part.id, applicantKind: 'individual' },
        201,
      );
      applicationId = draft.id;
      await call('POST', `/partnership-applications/${applicationId}/submit`, applicant, {}, 400);
      await call('PATCH', `/partnership-applications/${applicationId}`, applicant, {
        applicationMessage: '[DEMO] I offer fictional operations planning experience.',
        relevantExperience: '[DEMO] Synthetic demonstration, not a real professional claim.',
      });
      const form = new FormData();
      form.set('slotKey', 'demo-supporting');
      form.set('file', new Blob([demoPdf()], { type: 'application/pdf' }), 'DEMO-supporting.pdf');
      await call('POST', `/requests/${applicationId}/documents`, applicant, form, 201);
      await call('POST', `/partnership-applications/${applicationId}/submit`, applicant, {}, 201);
    } else applicationId = application.id.toString();
    await call('GET', `/partnership-applications/${applicationId}`, outsider, null, 404);
    await call('GET', `/partnership-applications/${applicationId}`, owner, null, 404);
    const applications = await call('GET', '/partnership-applications', applicant);
    assert(applications.items.some((row) => row.id === applicationId));
    const persisted = await prisma.request.findUniqueOrThrow({ where: { id: BigInt(applicationId) } });
    assert.equal(persisted.createdBy, fixtures.ids.applicant);
    assert.equal(persisted.parentRequestId, BigInt(part.id));
    assert.equal(persisted.visibility, 'private');
    record('Partnership create/validate/upload/submit/persist/track and IDOR', {
      applicationId,
      parentId: part.id,
      ownerCannotApply: true,
    });
    await call('GET', `/staff/partnership-applications/${applicationId}`, reviewer);
    if (persisted.status === 'underFarmExitReview')
      await call(
        'POST',
        `/staff/partnership-applications/${applicationId}/decide`,
        reviewer,
        { decision: 'approved', comment: '[DEMO] Synthetic application review, nonbinding.' },
        201,
      );
    assert.equal((await call('GET', `/partnership-applications/${applicationId}`, applicant)).status, 'approved');
    await call('GET', `/staff/partnership-applications/${applicationId}`, reviewer);
    record('Partnership staff review reflected in applicant tracking', { applicationId });

    async function communication(requestId, userToken, externalUserId, domain) {
      const existing = await prisma.communicationCase.findFirst({
        where: { requestId: BigInt(requestId), status: { not: 'closed' } },
      });
      if (!existing) await call('POST', '/communication/cases', userToken, { requestId }, 400);
      await call('PUT', `/staff/requests/${requestId}/assignments`, reviewer, {
        assignmentType: 'caseAgent',
        assignedStaffId: fixtures.ids.agent.toString(),
      });
      const caseRow = await call('POST', '/communication/cases', userToken, { requestId }, 201);
      const baseline = await call('GET', `/communication/cases/${caseRow.id}/messages`, userToken);
      await call('GET', `/communication/cases/${caseRow.id}`, outsider, null, 403);
      await call('GET', `/staff/communication/cases/${caseRow.id}`, agent);
      await call(
        'POST',
        `/communication/cases/${caseRow.id}/messages`,
        userToken,
        { body: '[DEMO] Question for FarmExit staff.', targetUserId: fixtures.ids.owner.toString() },
        400,
      );
      await call(
        'POST',
        `/communication/cases/${caseRow.id}/messages`,
        userToken,
        { body: `[DEMO] ${domain} question for FarmExit.` },
        201,
      );
      // Verify actual Socket.IO delivery using the normal one-use Website ticket and room authorization.
      const { io } = require(path.join(root, '..', 'web', 'node_modules', 'socket.io-client'));
      const ticket = await call('POST', '/communication/realtime-ticket', userToken, {}, 201);
      const origin = config.get('CORS_ORIGINS')[0];
      const socket = io('http://127.0.0.1:4001/communication', {
        path: config.get('SOCKET_IO_PATH'),
        auth: { ticket: ticket.ticket, audience: 'website' },
        transports: ['websocket'],
        extraHeaders: { Origin: origin },
        reconnection: false,
      });
      try {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Socket connection timeout')), 8000);
          socket.once('connect', () => {
            clearTimeout(timer);
            resolve();
          });
          socket.once('connect_error', (error) => {
            clearTimeout(timer);
            reject(error);
          });
        });
        const joined = await socket.timeout(8000).emitWithAck('conv.join', { caseId: caseRow.id });
        assert.equal(joined.ok, true);
        const delivered = new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('message.created timeout')), 8000);
          socket.once('message.created', (event) => {
            clearTimeout(timer);
            resolve(event);
          });
        });
        const reply = await call(
          'POST',
          `/staff/communication/cases/${caseRow.id}/messages?externalUserId=${externalUserId}`,
          agent,
          { body: `[DEMO] FarmExit reply for ${domain}.` },
          201,
        );
        const event = await delivered;
        assert.equal(event.message.id, reply.id);
      } finally {
        socket.disconnect();
      }
      const history = await call('GET', `/communication/cases/${caseRow.id}/messages`, userToken);
      assert.equal(history.total, baseline.total + 2);
      const older = await call('GET', `/communication/cases/${caseRow.id}/messages?page=2&pageSize=1`, userToken);
      assert.equal(older.items.length, 1);
      const staffHistory = await call('GET', `/staff/communication/cases/${caseRow.id}/messages`, agent);
      assert.equal(staffHistory.total, history.total);
      record(`${domain}: assigned case, user message, staff reply, Socket.IO, refresh, pagination and privacy`, {
        requestId,
        caseId: caseRow.id,
        messageCount: history.total,
      });
    }
    await communication(mgt.id, owner, fixtures.ids.owner.toString(), 'Management owner request');
    await communication(applicationId, applicant, fixtures.ids.applicant.toString(), 'Partnership application');
  } catch (error) {
    evidence.push({ scenario: 'Verification stopped at failed boundary', status: 'FAILED', cause: error.message });
    throw error;
  } finally {
    for (const session of sessions) {
      try {
        await call(
          'POST',
          session.audience === 'dashboard' ? '/admin-auth/logout' : '/auth/logout',
          session.token,
          {},
          204,
        );
        await call('GET', session.audience === 'dashboard' ? '/admin-auth/me' : '/auth/me', session.token, null, 401);
      } catch (error) {
        evidence.push({ scenario: 'Logout', status: 'FAILED', cause: error.message });
      }
    }
    const out = path.join(root, '..', 'docs', 'artifacts', 'client-demo-live-evidence.json');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(
      out,
      JSON.stringify(
        {
          date: new Date().toISOString(),
          database: { host: '127.0.0.1', name: 'farmexit' },
          fixtures: fixtures.requests,
          evidence,
        },
        null,
        2,
      ),
    );
    await app.close();
  }
}
module.exports = { verify, demoPdf };
