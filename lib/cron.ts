import cron from "node-cron"
import {
  getMonitorsFromEnv,
  getCheckIntervalSeconds,
  getHistoryRetentionDays,
  type MonitorConfig,
} from "./config"
import { checkAndSave } from "./checker"
import { cleanOldHistory, getCheckRecordNamesInRange } from "./db"
import { formatDate } from "./utils"

let cronJob: cron.ScheduledTask | null = null
let processDiagnosticsRegistered = false
let activeRuns = 0
let runSeq = 0
let lastRunStartedAt: number | null = null

function summarizeError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }
  return String(error)
}

function registerProcessDiagnostics() {
  if (processDiagnosticsRegistered) return
  processDiagnosticsRegistered = true

  console.log(
    `[process] started pid=${process.pid} node=${process.version} platform=${process.platform} arch=${process.arch} cwd=${process.cwd()} startedAt=${new Date().toISOString()} tzOffsetMin=${new Date().getTimezoneOffset()}`
  )

  process.on("beforeExit", (code) => {
    console.warn(`[process] beforeExit code=${code} uptimeSec=${Math.round(process.uptime())}`)
  })

  process.on("exit", (code) => {
    console.warn(`[process] exit code=${code} uptimeSec=${Math.round(process.uptime())}`)
  })

  process.on("warning", (warning) => {
    console.warn(`[process] warning name=${warning.name} message=${warning.message}`, warning)
  })

  process.on("uncaughtExceptionMonitor", (error) => {
    console.error(`[process] uncaughtExceptionMonitor error=${summarizeError(error)}`, error)
  })

  process.on("unhandledRejection", (reason) => {
    console.error(`[process] unhandledRejection reason=${summarizeError(reason)}`, reason)
  })
}

function alignToBucket(date: Date, intervalSeconds: number): Date {
  const intervalMs = intervalSeconds * 1000
  return new Date(Math.floor(date.getTime() / intervalMs) * intervalMs)
}

function buildCronExpression(intervalSeconds: number): { expression: string; wakeIntervalSeconds: number } {
  if (intervalSeconds === 60) {
    return { expression: '*/30 * * * * *', wakeIntervalSeconds: 30 }
  }

  if (intervalSeconds < 60) {
    return { expression: `*/${intervalSeconds} * * * * *`, wakeIntervalSeconds: intervalSeconds }
  }

  const minutes = Math.floor(intervalSeconds / 60)
  const seconds = intervalSeconds % 60
  return { expression: `${seconds} */${minutes} * * * *`, wakeIntervalSeconds: intervalSeconds }
}

export function getMonitorsToCheck(
  monitors: MonitorConfig[],
  bucketStartIso: string,
  bucketEndIso: string
): MonitorConfig[] {
  const existingMonitorNames = new Set(
    getCheckRecordNamesInRange(monitors.map((monitor) => monitor.name), bucketStartIso, bucketEndIso)
  )
  return monitors.filter((monitor) => !existingMonitorNames.has(monitor.name))
}

export function startCron() {
  if (cronJob) return

  registerProcessDiagnostics()

  const intervalSeconds = getCheckIntervalSeconds()
  const retentionDays = getHistoryRetentionDays()
  const monitors = getMonitorsFromEnv()
  const { expression: cronExpression, wakeIntervalSeconds } = buildCronExpression(intervalSeconds)

  console.log(
    `[cron] 启动定时任务，目标间隔 ${intervalSeconds} 秒，唤醒间隔 ${wakeIntervalSeconds} 秒，保留 ${retentionDays} 天历史 env.NODE_ENV=${process.env.NODE_ENV ?? "-"} env.DB_PATH=${process.env.DB_PATH ?? "-"}`
  )
  console.log(`[cron] 监控目标: ${monitors.map((m) => m.name).join(", ")}`)
  const doCheck = async (trigger = "schedule") => {
    const triggeredAt = new Date()
    const bucketStart = alignToBucket(triggeredAt, intervalSeconds)
    const bucketEnd = new Date(bucketStart.getTime() + intervalSeconds * 1000)
    const bucketStartIso = bucketStart.toISOString()
    const bucketEndIso = bucketEnd.toISOString()

    if (activeRuns > 0) {
      console.warn(
        `[cron] skip trigger=${trigger} reason=active-run activeRuns=${activeRuns} at=${triggeredAt.toISOString()} bucketStart=${bucketStartIso}`
      )
      return
    }

    const monitorsToCheck = getMonitorsToCheck(monitors, bucketStartIso, bucketEndIso)

    if (monitorsToCheck.length === 0) {
      console.log(
        `[cron] skip trigger=${trigger} reason=bucket-complete at=${triggeredAt.toISOString()} bucketStart=${bucketStartIso} bucketEnd=${bucketEndIso} monitorCount=${monitors.length}`
      )
      return
    }

    const runId = ++runSeq
    const startedAt = triggeredAt
    const startedAtMs = startedAt.getTime()
    const previousGapMs = lastRunStartedAt === null ? null : startedAtMs - lastRunStartedAt
    lastRunStartedAt = startedAtMs
    activeRuns += 1

    console.log(
      `[cron] run=${runId} start trigger=${trigger} at=${startedAt.toISOString()} local=${formatDate(startedAt)} bucketStart=${bucketStartIso} bucketEnd=${bucketEndIso} previousGapMs=${previousGapMs ?? "-"} activeRuns=${activeRuns} monitorCount=${monitors.length} selectedMonitorCount=${monitorsToCheck.length}`
    )

    if (previousGapMs !== null && previousGapMs > intervalSeconds * 1000 * 1.5) {
      console.warn(
        `[cron] run=${runId} schedule-gap previousGapMs=${previousGapMs} expectedMs=${intervalSeconds * 1000} previousGapSec=${Math.round(previousGapMs / 1000)}`
      )
    }

    if (activeRuns > 1) {
      console.warn(`[cron] run=${runId} overlap activeRuns=${activeRuns}`)
    }

    try {
      const results = await Promise.allSettled(
        monitorsToCheck.map(async (monitor) => {
          try {
            const saved = await checkAndSave(monitor, { runId, trigger })
            console.log(
              `[cron] run=${runId} monitor="${monitor.name}" fulfilled status=${saved.status} checked_at=${saved.checked_at} durationMs=${saved.duration_ms} dbDurationMs=${saved.db_duration_ms}`
            )
          } catch (error) {
            console.error(`[cron] run=${runId} monitor="${monitor.name}" rejected error=${summarizeError(error)}`, error)
            throw error
          }
        })
      )

      // 统计执行结果
      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failCount = results.filter(r => r.status === 'rejected').length
      console.log(`[cron] run=${runId} result success=${successCount} failed=${failCount}`)

      if (failCount > 0) {
        console.error(`[cron] run=${runId} failure-details:`, results)
      }

      try {
        cleanOldHistory(retentionDays)
      } catch (cleanError) {
        console.error(`[cron] run=${runId} clean-old-history-failed error=${summarizeError(cleanError)}`, cleanError)
      }

    } catch (error) {
      console.error(`[cron] run=${runId} flow-failed error=${summarizeError(error)}`, error)
    } finally {
      activeRuns -= 1
      const durationMs = Date.now() - startedAtMs
      console.log(
        `[cron] run=${runId} finish at=${new Date().toISOString()} local=${formatDate(new Date())} durationMs=${durationMs} activeRuns=${activeRuns}`
      )
    }
  }

  doCheck("startup")

  console.log(`[cron] 使用 cron 表达式: ${cronExpression}`)
  cronJob = cron.schedule(cronExpression, () => doCheck("schedule"))
}

export function stopCron() {
  if (cronJob) {
    cronJob.stop()
    cronJob = null
  }
}
