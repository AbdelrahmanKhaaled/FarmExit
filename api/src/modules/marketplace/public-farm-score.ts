import { Prisma } from '../../generated/prisma/client';
import { EvaluationStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

/** Published FarmExit evaluation only — never draft, approved-only, or internal notes. */
export function publicFarmExitScoreOut(
  scoreValue: Prisma.Decimal | number | string | null | undefined,
  scoreMax: Prisma.Decimal | number | string | null | undefined,
): number | null {
  if (scoreValue == null || scoreMax == null) return null;
  const value = Number(typeof scoreValue === 'object' ? scoreValue.toString() : scoreValue);
  const max = Number(typeof scoreMax === 'object' ? scoreMax.toString() : scoreMax);
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0 || value < 0 || value > max) return null;
  const onFive = (value / max) * 5;
  return Math.round(onFive * 10) / 10;
}

/** Latest published score per farm (newest publishedAt, then id). */
export async function loadPublishedFarmExitScores(
  prisma: PrismaService,
  farmIds: bigint[],
): Promise<Map<string, number>> {
  if (farmIds.length === 0) return new Map();
  const rows = await prisma.farmEvaluation.findMany({
    where: {
      farmId: { in: farmIds },
      status: EvaluationStatus.published,
      scoreValue: { not: null },
      scoreMax: { not: null },
    },
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    select: { farmId: true, scoreValue: true, scoreMax: true },
  });
  const out = new Map<string, number>();
  for (const row of rows) {
    const key = row.farmId.toString();
    if (out.has(key)) continue;
    const score = publicFarmExitScoreOut(row.scoreValue, row.scoreMax);
    if (score !== null) out.set(key, score);
  }
  return out;
}
