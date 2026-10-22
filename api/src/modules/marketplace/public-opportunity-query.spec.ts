import { RequestType } from '../../generated/prisma/enums';
import { buildPublicOpportunityWhere } from './public-opportunity-query';

describe('buildPublicOpportunityWhere', () => {
  it('keeps published approved public predicates', () => {
    const where = buildPublicOpportunityWhere(RequestType.farmManagement, {});
    expect(JSON.stringify(where)).toContain('"status":"approved"');
    expect(JSON.stringify(where)).toContain('"visibility":"public"');
    expect(JSON.stringify(where)).toContain('"farmManagement"');
  });

  it('applies farm filters', () => {
    const where = buildPublicOpportunityWhere(RequestType.partnership, {
      governorate: 'Giza',
      farmType: 'vegetable',
      minArea: 10,
      maxArea: 50,
    });
    const json = JSON.stringify(where);
    expect(json).toContain('Giza');
    expect(json).toContain('vegetable');
    expect(json).toContain('"gte":10');
    expect(json).toContain('"lte":50');
  });
});
