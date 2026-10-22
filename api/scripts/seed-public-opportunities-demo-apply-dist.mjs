import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const load = (module) => require(path.join(root, 'dist', module));
const { prepare } = require('./seed-public-opportunities-demo.cjs');

const tokens = {
  PrismaService: load('prisma/prisma.service').PrismaService,
  FarmsService: load('modules/farms/farms.service').FarmsService,
  FarmManagementRequestsService: load('modules/farm-management-requests/farm-management-requests.service').FarmManagementRequestsService,
  StaffFarmManagementReviewsService: load('modules/farm-management-requests/staff-farm-management-reviews.service').StaffFarmManagementReviewsService,
  PartnershipRequestsService: load('modules/partnership-requests/partnership-requests.service').PartnershipRequestsService,
  StaffPartnershipReviewsService: load('modules/partnership-requests/staff-partnership-reviews.service').StaffPartnershipReviewsService,
  OpportunityPublicationService: load('modules/requests/opportunity-publication.service').OpportunityPublicationService,
};

async function main() {
  const args = process.argv.slice(2);
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const result = await prepare(app, args, tokens);
    console.log('Apply summary:', result.stats);
    if (result.marketplace) console.log('Marketplace verification:', result.marketplace);
    const again = await prepare(app, args, tokens);
    if (again.stats.farmsCreated || again.stats.requestsCreated || again.stats.usersCreated) {
      throw new Error('Idempotency failed: second run created new rows.');
    }
    console.log('Idempotency: second run created zero farms/requests/users.');
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
