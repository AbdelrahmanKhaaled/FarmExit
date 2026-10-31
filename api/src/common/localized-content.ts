import type { Prisma } from '../generated/prisma/client';
import type { LocalizedContentDto } from './dto/localized-content.dto';
/** PATCH merges provided language fields; omission never deletes the other language. */
export function mergeLocalizedContent(existing: unknown, patch: LocalizedContentDto): Prisma.InputJsonObject {
  const old = existing && typeof existing === 'object' ? (existing as Record<string, Record<string, string>>) : {};
  const out: Record<string, Record<string, string>> = {};
  for (const language of ['en', 'ar'] as const) {
    const before = old[language] ?? {};
    out[language] = { ...before, ...patch[language] };
  }
  return JSON.parse(JSON.stringify(out)) as Prisma.InputJsonObject;
}
