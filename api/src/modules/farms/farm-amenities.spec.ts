import { ValidationPipe } from '@nestjs/common';
import { UpdateFarmSpecificationDto } from './dto/farm-specification.dto';
import { mergeAmenities } from './farm-specifications.service';

describe('approved Add Farm amenities', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = (body: unknown) => pipe.transform(body, { type: 'body', metatype: UpdateFarmSpecificationDto });
  it('accepts multiple approved choices and an explicit empty set', async () => {
    await expect(validate({ amenities: ['irrigationNetwork', 'powerConnection'] })).resolves.toMatchObject({
      amenities: ['irrigationNetwork', 'powerConnection'],
    });
    await expect(validate({ amenities: [] })).resolves.toMatchObject({ amenities: [] });
  });
  it.each([null, 'housing', ['arbitrary'], ['housing', 'housing']].map((amenities) => ({ amenities })))(
    'rejects invalid values %j',
    async ({ amenities }) => {
      await expect(validate({ amenities })).rejects.toThrow();
    },
  );
  it('preserves legacy object keys and clears only the selected set', () => {
    const stored = { gate: 'Retain', nested: { retained: true }, amenities: ['housing'] };
    expect(mergeAmenities(stored, ['packingStorage'])).toEqual({ ...stored, amenities: ['packingStorage'] });
    expect(mergeAmenities(stored, [])).toEqual({ ...stored, amenities: [] });
    expect(mergeAmenities(null, [])).toEqual({ amenities: [] });
  });
  it.each([['legacy'], 'legacy', 7].map((stored) => ({ stored })))(
    'does not overwrite non-object legacy JSON %j',
    ({ stored }) => {
      expect(() => mergeAmenities(stored, [])).toThrow('Existing facility details');
    },
  );
});
