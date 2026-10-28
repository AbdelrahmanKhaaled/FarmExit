import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createTranslator } from 'next-intl';

const root = new URL('../', import.meta.url);
const schema = readFileSync(new URL('../../api/prisma/schema.prisma', root), 'utf8');
const groups = {
  ProposalKind: 'proposalKind',
  RequestType: 'requestType',
  StaffRole: 'adminRole',
  ListingType: 'listingType',
  ProfessionalType: 'professionalType',
  CommunicationCaseStatus: 'caseStatus',
  VerificationStatus: 'status',
  CoPurchaseGroupStatus: 'status',
};
for (const locale of ['en', 'ar']) {
  test(`${locale}: all API enum names and database aliases have localized labels`, () => {
    const admin = JSON.parse(readFileSync(new URL(`messages/${locale}/admin.json`, root), 'utf8'));
    const errors = [];
    const t = createTranslator({
      locale,
      messages: { admin },
      namespace: 'admin.enums',
      onError: (e) => errors.push(e),
    });
    for (const [name, group] of Object.entries(groups)) {
      const block = schema.match(new RegExp(`enum ${name} \\{([\\s\\S]*?)\\}`))[1];
      for (const line of block.split('\n')) {
        const match = line.trim().match(/^(\w+)(?:\s+@map\("([^"]+)"\))?$/);
        if (!match) continue;
        for (const value of match.slice(1).filter(Boolean)) {
          const key = `${group}.${value}`;
          assert.ok(t.has(key), `${locale}: missing ${key}`);
          assert.ok(t(key).trim());
          assert.doesNotMatch(t(key), /\?\?\?/);
        }
      }
    }
    const unknown = 'proposalKind.future_kind';
    assert.equal(t.has(unknown) ? t(unknown) : t('unknown'), admin.enums.unknown);
    assert.deepEqual(errors, []);
  });
}
