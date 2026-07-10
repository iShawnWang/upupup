import { startCron, stopCron } from "./lib/cron"
import { closeDb } from "./lib/db"
import { startEventLoopDelayMonitor } from "./lib/runtime-observability"

const stopEventLoopDelayMonitor = startEventLoopDelayMonitor("worker")
let shuttingDown = false

function shutdown(signal: NodeJS.Signals, exitCode: number) {
  if (shuttingDown) return
  shuttingDown = true

  console.log(`[worker] shutdown signal=${signal} exitCode=${exitCode}`)
  stopCron()
  stopEventLoopDelayMonitor()
  closeDb()
  process.exit(exitCode)
}

process.once("SIGINT", () => shutdown("SIGINT", 0))
process.once("SIGTERM", () => shutdown("SIGTERM", 0))

try {
  startCron()
  console.log(`[worker] scheduler-ready pid=${process.pid}`)
} catch (error) {
  const errorName = error instanceof Error ? error.name : typeof error
  console.error(`[worker] startup-failed error=${errorName}`)
  shutdown("SIGTERM", 1)
}
