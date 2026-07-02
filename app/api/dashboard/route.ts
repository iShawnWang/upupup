import { NextResponse, NextRequest } from "next/server"
import { getDb, CheckRecord } from "@/lib/db"
import { getMonitorsFromEnv } from "@/lib/config"

// 时间范围配置
const TIME_RANGES = [
  { id: "1h", label: "1小时(分钟)", rangeMs: 60 * 60 * 1000, granularityMs: 60 * 1000, default: true },
  { id: "12h", label: "12小时(分钟)", rangeMs: 12 * 60 * 60 * 1000, granularityMs: 60 * 1000 },
  { id: "24h", label: "24小时(小时)", rangeMs: 24 * 60 * 60 * 1000, granularityMs: 60 * 60 * 1000 },
  { id: "30d", label: "30天(天)", rangeMs: 30 * 24 * 60 * 60 * 1000, granularityMs: 24 * 60 * 60 * 1000 },
]

// 单个时间点的数据
export interface HistoryPoint {
  time: string // ISO 字符串
  status: "up" | "down" | null
  latency_ms: number | null
  status_code: number | null
  error: string | null
}

// 单个监控目标的数据，包含多种时间范围的聚合
export interface MonitorData {
  name: string
  url: string
  status: "up" | "down"
  latency_ms: number | null
  uptime_24h: number
  uptime_7d: number
  last_checked: string
  last_error: string | null
  // 预聚合的各种时间范围数据（按需加载）
  history_points: {
    [rangeId: string]: HistoryPoint[]
  }
}

export interface DashboardResponse {
  monitors: MonitorData[]
  updated_at: string
  time_ranges: typeof TIME_RANGES
}

function calculateUptime(records: CheckRecord[]): number {
  if (records.length === 0) return 0
  const up = records.filter((r) => r.status === "up").length
  return Math.round((up / records.length) * 100)
}

// 聚合指定时间范围内的记录
function aggregateRecords(
  records: CheckRecord[],
  rangeMs: number,
  granularityMs: number,
  now: Date
): HistoryPoint[] {
  const startTime = new Date(now.getTime() - rangeMs)

  // 过滤时间范围内的记录
  const filteredRecords = records.filter(r => {
    const recordTime = new Date(r.checked_at)
    return recordTime >= startTime && recordTime <= now
  })

  // 按粒度聚合
  const points: HistoryPoint[] = []

  let currentTime = new Date(startTime)
  while (currentTime < now) {
    // 找到这个时间粒度内最新的一条记录
    const endTime = new Date(currentTime.getTime() + granularityMs)

    const recordInRange = filteredRecords.find(r => {
      const recordTime = new Date(r.checked_at)
      return recordTime >= currentTime && recordTime < endTime
    })

    points.push({
      time: currentTime.toISOString(),
      status: recordInRange ? recordInRange.status as "up" | "down" : null,
      latency_ms: recordInRange ? recordInRange.latency_ms : null,
      status_code: recordInRange ? recordInRange.status_code : null,
      error: recordInRange ? recordInRange.error : null,
    })

    currentTime = endTime
  }

  return points
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const requestedRanges = searchParams.getAll('range')

  const db = getDb()
  const monitors = getMonitorsFromEnv()
  const now = new Date()

  const result: DashboardResponse = {
    monitors: [],
    updated_at: now.toISOString(),
    time_ranges: TIME_RANGES,
  }

  // 确定需要聚合哪些时间范围 - 默认返回所有范围
  const rangesToAggregate = requestedRanges.length > 0
    ? TIME_RANGES.filter(r => requestedRanges.includes(r.id))
    : TIME_RANGES // 默认返回所有

  for (const monitor of monitors) {
    const allRecords = db
      .prepare("SELECT * FROM check_history WHERE name = ? ORDER BY checked_at DESC")
      .all(monitor.name) as CheckRecord[]

    const latest = allRecords[0]
    const records24h = allRecords.filter(
      (r) => new Date(r.checked_at) > new Date(now.getTime() - 24 * 60 * 60 * 1000)
    )
    const records7d = allRecords.filter(
      (r) => new Date(r.checked_at) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    )

    // 聚合各种时间范围的数据
    const history_points: { [key: string]: HistoryPoint[] } = {}
    for (const range of rangesToAggregate) {
      history_points[range.id] = aggregateRecords(allRecords, range.rangeMs, range.granularityMs, now)
    }

    result.monitors.push({
      name: monitor.name,
      url: monitor.url,
      status: latest?.status || "down",
      latency_ms: latest?.latency_ms || null,
      uptime_24h: calculateUptime(records24h),
      uptime_7d: calculateUptime(records7d),
      last_checked: latest?.checked_at || "",
      last_error: latest?.error || null,
      history_points,
    })
  }

  return NextResponse.json(result)
}
