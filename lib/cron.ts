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

    try {
      const results = await Promise.allSettled(
        monitors.map(async (monitor) => {
          try {
            await checkAndSave(monitor)
            console.log(`[cron] ✅ ${monitor.name} 检测成功`)
          } catch (error) {
            console.error(`[cron] ❌ ${monitor.name} 检测失败:`, error)
            throw error
          }
        })
      )

      // 统计执行结果
      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failCount = results.filter(r => r.status === 'rejected').length
      console.log(`[cron] 检测结果: 成功 ${successCount}, 失败 ${failCount}`)

      if (failCount > 0) {
        console.error(`[cron] 失败详情:`, results)
      }

      try {
        cleanOldHistory(retentionDays)
      } catch (cleanError) {
        console.error(`[cron] 清理旧记录失败:`, cleanError)
      }

    } catch (error) {
      console.error(`[cron] 检测流程异常:`, error)
    }

    console.log(`[cron] 检测完成 ${formatDate(new Date())}`)
  }

  doCheck()

  let cronExpression: string
  if (intervalSeconds === 60) {
    // 每分钟执行一次，在第 0 秒
    cronExpression = '0 * * * * *'
  } else if (intervalSeconds < 60) {
    // 少于 60 秒，用秒级表达式
    cronExpression = `*/${intervalSeconds} * * * * *`
  } else {
    // 超过 60 秒，转换为分钟和秒
    const minutes = Math.floor(intervalSeconds / 60)
    const seconds = intervalSeconds % 60
    cronExpression = `${seconds} */${minutes} * * * *`
  }

  console.log(`[cron] 使用 cron 表达式: ${cronExpression}`)
  cronJob = cron.schedule(cronExpression, doCheck)
}

export function stopCron() {
  if (cronJob) {
    cronJob.stop()
    cronJob = null
  }
}
