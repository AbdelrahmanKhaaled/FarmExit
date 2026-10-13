import { PUBLIC_LISTING_FIELDS, PUBLIC_LISTING_FORBIDDEN } from './public-listing-contract';

describe('public listing contract', () => {
  it('keeps the public allowlist disjoint from private farm, contact, media and audit fields', () => {
    const allowed = new Set<string>(PUBLIC_LISTING_FIELDS);
    expect(PUBLIC_LISTING_FIELDS.length).toBe(allowed.size);
    for (const field of PUBLIC_LISTING_FORBIDDEN) {
      expect(allowed.has(field)).toBe(false);
    }
    expect(allowed.has('governorate')).toBe(true);
    expect(allowed.has('areaName')).toBe(true);
    expect(allowed.has('privatePinLatitude')).toBe(false);
    expect(allowed.has('storageKey')).toBe(false);
  });
});
