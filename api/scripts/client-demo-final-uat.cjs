/* Interactive local UAT harness. Uses existing demo identities; never seeds or publishes. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash, randomBytes } = require('node:crypto');
const { assertLocalDevelopment } = require('./client-demo-safety.cjs');
const { PEOPLE } = require('./seed-client-demo.cjs');
const root = path.resolve(__dirname, '..');
const load = (name) => require(path.join(root, 'dist', name));

async function main() {
  require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
  console.log('Target:', assertLocalDevelopment(process.env));
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = load('app.module');
  const { PrismaService } = load('prisma/prisma.service');
  const { configureApp } = load('common/app-setup');
  const { ConfigService } = require('@nestjs/config');
  const { FarmExitSocketIoAdapter } = load('common/socket-io.adapter');
  const { SMS_PROVIDER } = load('modules/auth/sms/sms-provider');
  const app = await NestFactory.create(AppModule, { logger: false });
  app.useWebSocketAdapter(new FarmExitSocketIoAdapter(app, app.get(ConfigService).get('SOCKET_IO_PATH')));
  configureApp(app);
  const prisma = app.get(PrismaService);
  const [database] = await prisma.$queryRaw`SELECT DATABASE() AS databaseName, @@hostname AS serverHostname`;
  assert.equal(database.databaseName, 'farmexit');
  assert.equal(database.serverHostname.toLowerCase(), require('node:os').hostname().toLowerCase());
  const fixtureUsers = {};
  for (const [key, mobileE164, fullName] of PEOPLE) {
    const user = await prisma.user.findUniqueOrThrow({ where: { mobileE164 } });
    assert.equal(user.fullName, fullName);
    assert.equal(user.email, `client-demo-${key}@farmexit.invalid`);
    fixtureUsers[key] = user;
  }
  const prior = await prisma.request.findMany({ where: { id: { lt: 769n } }, orderBy: { id: 'asc' } });
  const oldFarms = await prisma.farm.findMany({ where: { createdBy: { notIn: Object.values(fixtureUsers).map((u) => u.id) } }, orderBy: { id: 'asc' } });
  const digest = (value) => createHash('sha256').update(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item)).digest('hex');
  const out = path.join(root, '..', 'docs', 'artifacts', 'website-final-uat');
  fs.mkdirSync(out, { recursive: true });
  const existingEvidence = fs.existsSync(path.join(out, 'evidence.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'evidence.json'), 'utf8')) : { evidence: [], errors: [] };
  const evidence = existingEvidence.evidence, errors = existingEvidence.errors, contexts = [];
  let browser;
  const save = () => fs.writeFileSync(path.join(out, 'evidence.json'), JSON.stringify({ date: new Date().toISOString(), evidence, errors }, null, 2));
  try {
    await app.listen(4001, '127.0.0.1');
    browser = await require(path.join(root, '..', 'web', 'node_modules', '@playwright/test')).chromium.launch({ headless: true });
    const r = {
      app, prisma, assert, out, load, fixtureUsers, state: {}, browser, contexts,
      record(name, details) { const item = { workflow: name, ...details }; evidence.push(item); save(); console.log(JSON.stringify(item)); },
      async context() {
        const context = await browser.newContext({ baseURL: 'http://localhost:3000', viewport: { width: 1440, height: 1000 } });
        await context.route('**/*', (route) => new URL(route.request().url()).port === '4000' ? route.abort() : route.continue());
        contexts.push(context); return context;
      },
      async page(context) {
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        page.setDefaultNavigationTimeout(20000);
        page.on('pageerror', (error) => errors.push({ url: page.url(), message: error.message }));
        page.on('response', (response) => {
          const url = new URL(response.url());
          if (url.pathname.startsWith('/api/') && response.status() >= 500) errors.push({ url: url.pathname, status: response.status() });
        });
        return page;
      },
      async api(context, method, route, body, expected = 200) {
        const res = await context.request.fetch(route, { method, ...(body === undefined ? {} : { data: body }), timeout: 60000 });
        let data; try { data = await res.json(); } catch { data = null; }
        assert.equal(res.status(), expected, `${method} ${route} -> ${res.status()}: ${JSON.stringify(data)}`);
        return data;
      },
      async login(context, key) {
        const user = fixtureUsers[key];
        let res = await context.request.post('/api/auth/otp/request', { data: { mobile: user.mobileE164 } });
        if (res.status() === 429) {
          const data = await res.json();
          if (!(data.retryAfterSeconds > 0 && data.retryAfterSeconds <= 60)) throw new Error('OTP rate limit: cannot bypass hourly limit.');
          console.log('Waiting for existing OTP cooldown:', data.retryAfterSeconds);
          await new Promise((resolve) => setTimeout(resolve, data.retryAfterSeconds * 1000 + 100));
          res = await context.request.post('/api/auth/otp/request', { data: { mobile: user.mobileE164 } });
        }
        assert.equal(res.status(), 200);
        const code = app.get(SMS_PROVIDER).lastCodeFor(user.mobileE164);
        assert(code);
        await r.api(context, 'POST', '/api/auth/otp/verify', { mobile: user.mobileE164, code });
        return { id: user.id.toString(), name: user.fullName };
      },
      async goto(page, route, text) {
        const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60000 });
        assert(response && response.status() < 400, `${route} HTTP ${response?.status()}`);
        if (text) await page.getByText(text, { exact: false }).first().waitFor({ timeout: 20000 });
        return response.status();
      },
      async screenshot(page, name) { await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true }); },
      async inspect(page, name) {
        const fields = await page.locator('input,select,textarea,button').evaluateAll((nodes) => nodes.map((node) => ({ tag: node.tagName, type: node.getAttribute('type'), name: node.getAttribute('name'), id: node.id, label: node.getAttribute('aria-label'), placeholder: node.getAttribute('placeholder'), text: node.tagName === 'BUTTON' ? node.textContent.trim().slice(0,100) : null, disabled: node.disabled, options: node.tagName === 'SELECT' ? Array.from(node.options).map((option) => ({ value: option.value, label: option.label })) : undefined })));
        fs.writeFileSync(path.join(out, name + '-controls.json'), JSON.stringify(fields, null, 2));
        console.log(JSON.stringify({ screen: name, url: page.url(), fields }));
      },
      async staff() {
        if (r.state.staffToken) return r.state.staffToken;
        const user = fixtureUsers.reviewer;
        const password = randomBytes(32).toString('base64url');
        await prisma.adminCredential.update({ where: { userId: user.id }, data: { passwordHash: await require('argon2').hash(password) } });
        await prisma.auditLog.create({ data: { actorUserId: user.id, entityType: 'user', entityId: user.id, action: 'client_demo_uat_credential_rotated', changes: { synthetic: true } } });
        const res = await fetch('http://127.0.0.1:4001/api/v1/admin-auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password }) });
        assert.equal(res.status, 200);
        const pair = await res.json(); r.state.staffToken = pair.accessToken; return pair.accessToken;
      },
      async staffApi(method, route, body, expected = 200) {
        const token = await r.staff();
        const res = await fetch('http://127.0.0.1:4001/api/v1'+route, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type':'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
        let data; try { data = await res.json(); } catch { data = null; }
        assert.equal(res.status, expected, `${route}: ${res.status} ${JSON.stringify(data)}`); return data;
      },
    };
    r.guest = await r.context(); r.guestPage = await r.page(r.guest);
    r.user = await r.context(); r.page = await r.page(r.user);
    console.log('UAT READY. Existing fixtures only. Submit one JSON line: {"code":"..."} or {"finish":true}.');
    const readline = require('node:readline').createInterface({ input: process.stdin, terminal: false });
    for await (const line of readline) {
      if (!line.trim()) continue;
      let command;
      try {
        command = JSON.parse(line);
        if (command.finish) { readline.close(); break; }
        const run = new (Object.getPrototypeOf(async function(){}).constructor)('r', command.code);
        await run(r);
        console.log('STAGE COMPLETE');
      } catch (error) { console.log('STAGE FAILED:', error.message); r.record(command?.name ?? 'UAT stage', { status:'FAILED', bug:error.message }); }
    }
    const after = await prisma.request.findMany({ where: { id: { in: prior.map((row) => row.id) } }, orderBy: { id:'asc' } });
    const farmsAfter = await prisma.farm.findMany({ where: { id: { in:oldFarms.map((row) => row.id) } }, orderBy:{id:'asc'} });
    r.record('Safety: pre-existing requests and non-fixture farms', { status:'ISOLATED DB VERIFIED', originalRequestCount:prior.length, requestsUnchanged:digest(prior)===digest(after), nonFixtureFarmsUnchanged:digest(oldFarms)===digest(farmsAfter), request753Untouched: digest(prior.find((row) => row.id===753n))===digest(after.find((row) => row.id===753n)) });
    assert.equal(digest(prior), digest(after), 'Pre-existing requests changed.');
    assert.equal(digest(oldFarms), digest(farmsAfter), 'Non-fixture farm changed.');
    for (const context of contexts) await context.request.post('/api/auth/logout').catch(() => null);
    if (r.state.staffToken) await fetch('http://127.0.0.1:4001/api/v1/admin-auth/logout', { method:'POST',headers:{ Authorization:`Bearer ${r.state.staffToken}` } });
  } finally { save(); if (browser) await browser.close(); await app.close(); }
}
main().catch((error) => { console.error(error.message); process.exitCode=1; });
