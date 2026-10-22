export const SCROLL_NEAR_BOTTOM_THRESHOLD_PX = 80;

export function isNearScrollBottom(
  scrollHeight: number,
  scrollTop: number,
  clientHeight: number,
  threshold = SCROLL_NEAR_BOTTOM_THRESHOLD_PX,
): boolean {
  return scrollHeight - scrollTop - clientHeight < threshold;
}

export function shouldStickToLatest(forceLatest: boolean, nearBottom: boolean): boolean {
  return forceLatest || nearBottom;
}
