import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MarketplaceQueryDto } from './dto/marketplace-query.dto';
import { CreateFarmDto } from '../farms/dto/create-farm.dto';
import { buildMarketplaceWhere, assertMarketplaceRanges } from './marketplace-query';
import { buildPublicOpportunityWhere } from './public-opportunity-query';
import { publicContent } from './public-localized-content';
import { mergeLocalizedContent } from '../../common/localized-content';
describe('Batch 3 public contract', () => {
  it('keeps explicit Quick Sale independent from payment eligibility', () => {
    const q = buildMarketplaceWhere({ quickSale: 'true', saleMethods: ['installment', 'exchange'] });
    const json = JSON.stringify(q);
    expect(json).toContain('"saleMode":"quickSale"');
    expect(json).toContain('acceptsInstallmentProposals');
    expect(json).toContain('acceptsExchangeProposals');
    expect(JSON.stringify(buildMarketplaceWhere({ saleMethods: ['installment'] }))).not.toContain('quickSale');
    expect(() => assertMarketplaceRanges({ quickSale: 'true', listingType: 'rent' })).toThrow();
  });
  it('puts agricultural predicates and privacy restrictions in the full-dataset where', () => {
    const q = JSON.stringify(
      buildMarketplaceWhere({
        farmTypes: ['fruit'],
        waterSources: ['well'],
        irrigationMethods: ['drip'],
        energySources: ['solar'],
        cropTypes: ['citrus'],
      }),
    );
    for (const term of ['fruit', 'well', 'drip', 'solar', 'citrus', 'published', 'public', 'deletedAt'])
      expect(q).toContain(term);
    expect(q).not.toContain('skip');
  });
  it('matches exact structured JSON members instead of substring comparisons', () => {
    expect(
      JSON.stringify(buildPublicOpportunityWhere('farmManagement', { managementType: 'fullOperationManagement' })),
    ).toContain('array_contains');
    expect(
      JSON.stringify(
        buildPublicOpportunityWhere('partnership', { objective: 'expandCultivation', partnerType: 'company' }),
      ),
    ).not.toContain('string_contains');
  });
  it('rejects unsupported facet values at the HTTP boundary', async () => {
    const dto = plainToInstance(MarketplaceQueryDto, { energySources: 'privateSecret', quickSale: 'maybe' });
    expect((await validate(dto)).length).toBe(2);
  });
  it('accepts optional bilingual author content without forcing legacy backfills', async () => {
    const base = { name: 'Legacy orchard', farmType: 'fruit', areaFeddan: 10, governorate: 'Beheira' };
    expect(await validate(plainToInstance(CreateFarmDto, base))).toHaveLength(0);
    expect(
      await validate(
        plainToInstance(CreateFarmDto, {
          ...base,
          localizedContent: { en: { name: 'Orchard' }, ar: { name: 'بستان' } },
        }),
      ),
    ).toHaveLength(0);
  });
  it('rejects private/mass-assigned nested content keys', async () => {
    const dto = plainToInstance(CreateFarmDto, {
      name: 'Test',
      farmType: 'fruit',
      areaFeddan: 10,
      governorate: 'Beheira',
      localizedContent: { ar: { privatePinLatitude: 'secret' } },
    });
    expect((await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).length).toBeGreaterThan(0);
  });
  it('preserves the opposite language through an authorized partial edit', () => {
    expect(
      mergeLocalizedContent({ en: { name: 'Orchard' }, ar: { name: 'بستان' } }, { ar: { description: 'وصف' } }),
    ).toEqual({ en: { name: 'Orchard' }, ar: { name: 'بستان', description: 'وصف' } });
  });
  it('does not leak private farm descriptions, contacts, or pins in translated public projections', () => {
    expect(
      publicContent(
        { en: { name: 'Orchard', description: 'Owner-only', email: 'private', privatePinLatitude: '30' } },
        ['name', 'mainActivity'],
      ),
    ).toEqual({ en: { name: 'Orchard' } });
  });
});
