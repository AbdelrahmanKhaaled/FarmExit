import { Prisma } from '../../generated/prisma/client';
import { publicFarmExitScoreOut } from './public-farm-score';

describe('publicFarmExitScoreOut', () => {
  it('normalizes a published score onto a 0–5 scale', () => {
    expect(publicFarmExitScoreOut(new Prisma.Decimal('4.80'), new Prisma.Decimal('5.00'))).toBe(4.8);
    expect(publicFarmExitScoreOut(96, 100)).toBe(4.8);
  });

  it('returns null when values are missing or invalid', () => {
    expect(publicFarmExitScoreOut(null, 5)).toBeNull();
    expect(publicFarmExitScoreOut(4, 0)).toBeNull();
    expect(publicFarmExitScoreOut(6, 5)).toBeNull();
  });
});
