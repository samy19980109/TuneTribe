export function getChorusOffsetMs(durationMs: number): number {
  const MIN_OFFSET = 15_000
  const MIN_BEFORE_END = 30_000

  let ratio: number
  if (durationMs < 120_000) {
    ratio = 0.3
  } else if (durationMs <= 300_000) {
    ratio = 0.4
  } else {
    ratio = 0.35
  }

  const offset = Math.round(durationMs * ratio)
  const maxOffset = Math.max(0, durationMs - MIN_BEFORE_END)

  return Math.max(MIN_OFFSET, Math.min(offset, maxOffset))
}
