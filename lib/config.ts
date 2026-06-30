export interface MonitorConfig {
  name: string
  url: string
  method?: string
  keyword?: string
  expectedStatus?: number
  timeout?: number
}

export function getMonitorsFromEnv(): MonitorConfig[] {
  const monitorsJson = process.env.MONITORS
  if (!monitorsJson) {
    throw new Error("MONITORS 环境变量未设置")
  }
  try {
    const monitors = JSON.parse(monitorsJson) as MonitorConfig[]
    return monitors.map((m) => ({
      ...m,
      method: m.method || "GET",
      expectedStatus: m.expectedStatus || 200,
      timeout: m.timeout || 30000,
    }))
  } catch (e) {
    throw new Error("MONITORS 环境变量 JSON 解析失败")
  }
}

export function getCheckIntervalSeconds(): number {
  const val = process.env.CHECK_INTERVAL_SECONDS
  const num = val ? parseInt(val, 10) : 60
  return Math.max(30, num)
}

export function getHistoryRetentionDays(): number {
  const val = process.env.HISTORY_RETENTION_DAYS
  const num = val ? parseInt(val, 10) : 90
  return Math.max(1, num)
}

export function getDbPath(): string {
  return process.env.DB_PATH || "./data/monitor.db"
}
