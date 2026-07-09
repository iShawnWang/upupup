export const TIME_RANGES = [
  { id: "1h", label: "control.range.1h", rangeMs: 60 * 60 * 1000, granularityMs: 60 * 1000, default: true },
  { id: "12h", label: "control.range.12h", rangeMs: 12 * 60 * 60 * 1000, granularityMs: 60 * 1000 },
  { id: "24h", label: "control.range.24h", rangeMs: 24 * 60 * 60 * 1000, granularityMs: 60 * 60 * 1000 },
  { id: "30d", label: "control.range.30d", rangeMs: 30 * 24 * 60 * 60 * 1000, granularityMs: 24 * 60 * 60 * 1000 },
]

export const DEFAULT_TIME_RANGE_ID = TIME_RANGES.find((range) => range.default)?.id ?? TIME_RANGES[0].id
