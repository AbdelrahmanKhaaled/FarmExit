export const entryModes = ['quickSale', 'standardSale', 'rent'] as const;
export type EntryMode = (typeof entryModes)[number];
export function parseEntryMode(value: unknown): EntryMode | undefined {
  return entryModes.includes(value as EntryMode) ? (value as EntryMode) : undefined;
}
export function entryStorageKey(userId: string, draftId: string) {
  return `fx:listing-entry:v1:${userId}:${draftId}`;
}
export function readEntryMode(userId: string, draftId: string) {
  return parseEntryMode(localStorage.getItem(entryStorageKey(userId, draftId)));
}
export function saveEntryMode(userId: string, draftId: string, mode: EntryMode) {
  const key = entryStorageKey(userId, draftId);
  const previous = parseEntryMode(localStorage.getItem(key));
  if (previous && previous !== mode) throw new Error('entry conflict');
  localStorage.setItem(key, mode);
}
