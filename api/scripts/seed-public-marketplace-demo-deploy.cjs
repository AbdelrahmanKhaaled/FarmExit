/**
 * Post-deploy: farms + management + partnership [DEMO] marketplace seeds when deploy flags are set.
 */
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { deploySeedEnabled, resolveDeploySeedArgv } = require('./public-farms-demo-safety.cjs');

const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });

if (!deploySeedEnabled(process.env)) {
  console.log('Deploy marketplace demo seed skipped (set PUBLIC_MARKETPLACE_DEMO_SEED_ON_DEPLOY=true or PUBLIC_FARMS_DEMO_SEED_ON_DEPLOY=true).');
  process.exit(0);
}

const deployArgv = resolveDeploySeedArgv(process.env);
const scripts = ['seed-public-farms-demo.cjs', 'seed-public-opportunities-demo.cjs'];

for (const script of scripts) {
  console.log(`\n=== ${script} ===`);
  const child = spawnSync('node', [path.join(__dirname, script), ...deployArgv], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (child.status !== 0) process.exit(child.status ?? 1);
}
