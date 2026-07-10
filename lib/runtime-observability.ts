const SAMPLE_INTERVAL_MS = 1_000
const REPORT_INTERVAL_MS = 30_000
const WARN_THRESHOLD_MS = 250

interface ActiveMonitor {
  stop: () => void
}

let activeMonitor: ActiveMonitor | null = null

export function startEventLoopDelayMonitor(label: string): () => void {
  if (activeMonitor) return activeMonitor.stop

  let expectedAt = performance.now() + SAMPLE_INTERVAL_MS
  let sampleCount = 0
  let totalDelayMs = 0
  let maxDelayMs = 0

  const sampleTimer = setInterval(() => {
    const now = performance.now()
    const delayMs = Math.max(0, now - expectedAt)
    expectedAt = now + SAMPLE_INTERVAL_MS
    sampleCount += 1
    totalDelayMs += delayMs
    maxDelayMs = Math.max(maxDelayMs, delayMs)

    if (delayMs > WARN_THRESHOLD_MS) {
      console.warn(
        `[event-loop] process=${label} status=delayed delayMs=${delayMs.toFixed(2)} thresholdMs=${WARN_THRESHOLD_MS}`
      )
    }
  }, SAMPLE_INTERVAL_MS)

  const reportTimer = setInterval(() => {
    const averageDelayMs = sampleCount === 0 ? 0 : totalDelayMs / sampleCount
    console.log(
      `[event-loop] process=${label} status=summary samples=${sampleCount} averageDelayMs=${averageDelayMs.toFixed(2)} maxDelayMs=${maxDelayMs.toFixed(2)}`
    )
    sampleCount = 0
    totalDelayMs = 0
    maxDelayMs = 0
  }, REPORT_INTERVAL_MS)

  sampleTimer.unref?.()
  reportTimer.unref?.()

  let stopped = false
  const monitor: ActiveMonitor = {
    stop: () => {
      if (stopped) return
      stopped = true
      clearInterval(sampleTimer)
      clearInterval(reportTimer)
      if (activeMonitor === monitor) {
        activeMonitor = null
      }
    },
  }

  activeMonitor = monitor
  return monitor.stop
}
