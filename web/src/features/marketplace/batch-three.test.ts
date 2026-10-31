import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseState, toSearchParams } from './url-state';
import { marketplaceStateToApiQuery, publicListingToMarketplaceListing } from '@/lib/data/marketplace-api';
import { contentText } from '@/lib/content/localized';
import type { PublicListingDto } from '@/lib/api/public-listing';
test('Quick Sale, activity and agricultural constraints survive URL roundtrips before server pagination', () => {
  const state = parseState(
    new URLSearchParams(
      'quickSale=true&activity=fruit&location=giza&water=well&irrigation=drip&energy=solar&crop=citrus&sizeMin=20&priceMin=6000000&saleMethods=installment,exchange&page=2',
    ),
  );
  const query = marketplaceStateToApiQuery(state, 9);
  assert.equal(query.quickSale, 'true');
  assert.equal(query.farmTypes, 'fruit');
  assert.equal(query.governorate, 'Giza');
  assert.equal(query.waterSources, 'well');
  assert.equal(query.irrigationMethods, 'drip');
  assert.equal(query.energySources, 'solar');
  assert.equal(query.cropTypes, 'citrus');
  assert.equal(query.page, '2');
  assert.deepEqual(parseState(new URLSearchParams(toSearchParams(state))), state);
});
test('missing translations use legacy text without inventing either language', () => {
  assert.equal(contentText({ ar: { name: 'بستان' } }, 'ar', 'name', 'Legacy'), 'بستان');
  assert.equal(contentText(null, 'ar', 'name', 'Legacy'), 'Legacy');
  assert.equal(contentText({ en: { name: 'Orchard' } }, 'ar', 'name', ''), 'Orchard');
});
test('public card chooses each authored language and keeps missing scores null', () => {
  const dto = {
    id: '1',
    slug: 'test',
    farmName: 'Legacy',
    localizedContent: { en: { name: 'Orchard' }, ar: { name: 'بستان' } },
    governorate: 'Giza',
    areaName: null,
    areaFeddan: 10,
    listingType: 'sale',
    askingPrice: 100000,
    annualRentPerFeddan: null,
    statedSalePricePerFeddan: null,
    currency: 'EGP',
    availability: null,
    listingDescription: null,
    highlights: [],
    publishedAt: null,
    farmExitScore: null,
  } satisfies PublicListingDto;
  const card = publicListingToMarketplaceListing(dto);
  assert.deepEqual(card.name, { en: 'Orchard', ar: 'بستان' });
  assert.equal(card.score, null);
});
