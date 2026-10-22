/**
 * Post-deploy / CI entry: idempotent [DEMO] PFM marketplace seed when PUBLIC_FARMS_DEMO_SEED_ON_DEPLOY=true.
 * Skips safely when that flag is unset.
 */
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { resolveDeploySeedArgv } = require('./public-farms-demo-safety.cjs');

const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });

const deployArgv = resolveDeploySeedArgv(process.env);
if (!deployArgv) {
  console.log('PUBLIC_FARMS_DEMO_SEED_ON_DEPLOY is not true; skipping public farms demo seed.');
  process.exit(0);
}

const child = spawnSync('node', [path.join(__dirname, 'seed-public-farms-demo.cjs'), ...deployArgv], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
process.exit(child.status ?? 1);
