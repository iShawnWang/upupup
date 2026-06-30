import cron from "node-cron"
import { getMonitorsFromEnv, getCheckIntervalSeconds, getHistoryRetentionDays } from "./config"
import { checkAndSave } from "./checker"
import { cleanOldHistory } from "./db"
import { formatDate } from "./utils"

let cronJob: cron.ScheduledTask | null = null

export function startCron() {
  if (cronJob) return

  const intervalSeconds = getCheckIntervalSeconds()
  const retentionDays = getHistoryRetentionDays()
  const monitors = getMonitorsFromEnv()

  console.log(`[cron] 启动定时任务，间隔 ${intervalSeconds} 秒，保留 ${retentionDays} 天历史`)
  console.log(`[cron] 监控目标: ${monitors.map((m) => m.name).join(", ")}`)

  const doCheck = async () => {
    console.log(`[cron] 开始检测... ${formatDate(new Date())}`)
    await Promise.allSettled(monitors.map(checkAndSave))
    cleanOldHistory(retentionDays)
    console.log(`[cron] 检测完成 ${formatDate(new Date())}`)
  }

  doCheck()

  cronJob = cron.schedule(`*/${intervalSeconds} * * * * *`, doCheck)
}

export function stopCron() {
  if (cronJob) {
    cronJob.stop()
    cronJob = null
  }
}
