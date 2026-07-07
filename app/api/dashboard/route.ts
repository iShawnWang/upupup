import { NextResponse, NextRequest } from "next/server"
import { getDb, CheckRecord } from "@/lib/db"
import { getMonitorsFromEnv } from "@/lib/config"
import { formatDate } from "@/lib/utils"

// 时间范围配置（label 为 i18n 翻译 key，由前端按语言渲染）
const TIME_RANGES = [
  { id: "1h", label: "control.range.1h", rangeMs: 60 * 60 * 1000, granularityMs: 60 * 1000, default: true },
  { id: "12h", label: "control.range.12h", rangeMs: 12 * 60 * 60 * 1000, granularityMs: 60 * 1000 },
  { id: "24h", label: "control.range.24h", rangeMs: 24 * 60 * 60 * 1000, granularityMs: 60 * 60 * 1000 },
  { id: "30d", label: "control.range.30d", rangeMs: 30 * 24 * 60 * 60 * 1000, granularityMs: 24 * 60 * 60 * 1000 },
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

function formatLogTime(dateLike: Date | string): string {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike)
  return Number.isNaN(date.getTime()) ? String(dateLike) : formatDate(date)
}

// 聚合指定时间范围内的记录
function aggregateRecords(
  records: CheckRecord[],
  rangeMs: number,
  granularityMs: number,
  now: Date
): HistoryPoint[] {
  // 对齐时间到整粒度
  function alignToGranularity(date: Date, granularity: number): Date {
    const timestamp = date.getTime()
    const aligned = Math.floor(timestamp / granularity) * granularity
    return new Date(aligned)
  }

  const nowAligned = alignToGranularity(now, granularityMs)
  const startTime = new Date(nowAligned.getTime() - rangeMs)
  const startTimeAligned = alignToGranularity(startTime, granularityMs)

  console.log(`[dashboard] 聚合记录: startTime=${formatLogTime(startTimeAligned)}, now=${formatLogTime(nowAligned)}, records=${records.length}, granularity=${granularityMs}ms`)

  // 过滤时间范围内的记录
  const filteredRecords = records.filter(r => {
    try {
      const recordTime = new Date(r.checked_at)
      return recordTime >= startTimeAligned && recordTime <= nowAligned
    } catch (e) {
      console.warn(`[dashboard] 日期解析失败:`, r.checked_at, e)
      return false
    }
  })

  console.log(`[dashboard] 过滤后记录: ${filteredRecords.length} 条`)

  // 按粒度聚合
  const points: HistoryPoint[] = []

  let currentTime = new Date(startTimeAligned)
  while (currentTime < nowAligned) {
    // 找到这个时间粒度内的所有记录
    const endTime = new Date(currentTime.getTime() + granularityMs)

    let recordsInRange: CheckRecord[] = []
    try {
      recordsInRange = filteredRecords.filter(r => {
        const recordTime = new Date(r.checked_at)
        return recordTime >= currentTime && recordTime < endTime
      })
    } catch (e) {
      console.warn(`[dashboard] 查找记录时出错:`, e)
    }

    // 聚合该时间段的记录
    let aggregatedPoint: HistoryPoint = {
      time: currentTime.toISOString(),
      status: null,
      latency_ms: null,
      status_code: null,
      error: null,
    }

    if (recordsInRange.length > 0) {
      // 策略1: 只要有一个 down，就显示 down（保守策略）
      const hasDown = recordsInRange.some(r => r.status === 'down')
      aggregatedPoint.status = hasDown ? 'down' : 'up'

      // 策略2: 优先选择最后一个失败点，否则选最新的成功点
      const representativeRecord = hasDown
        ? recordsInRange.find(r => r.status === 'down') // 找到第一个失败（因为是DESC，实际是最后一个失败）
        : recordsInRange[0]

      if (representativeRecord) {
        aggregatedPoint.latency_ms = representativeRecord.latency_ms
        aggregatedPoint.status_code = representativeRecord.status_code
        aggregatedPoint.error = representativeRecord.error
      }
    }

    points.push(aggregatedPoint)

    currentTime = endTime
  }

  console.log(`[dashboard] 生成 ${points.length} 个时间点`)
  return points
}

export async function GET(request: NextRequest) {
  console.log(`[dashboard] 收到请求: ${request.url}`)

  try {
    const { searchParams } = new URL(request.url)
    const requestedRanges = searchParams.getAll('range')

    const db = getDb()
    const monitors = getMonitorsFromEnv()
    const now = new Date()

    console.log(`[dashboard] 处理 ${monitors.length} 个监控目标`)

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
      try {
        console.log(`[dashboard] 处理监控: ${monitor.name}`)

        let allRecords: CheckRecord[] = []
        try {
          allRecords = db
            .prepare("SELECT * FROM check_history WHERE name = ? ORDER BY checked_at DESC")
            .all(monitor.name) as CheckRecord[]
          console.log(`[dashboard] ${monitor.name}: 找到 ${allRecords.length} 条记录`)
        } catch (dbError) {
          console.error(`[dashboard] ${monitor.name} 数据库查询失败:`, dbError)
        }

        const latest = allRecords[0]
        console.log(`[dashboard] ${monitor.name}: latest=`, latest ? { status: latest.status, time: formatLogTime(latest.checked_at) } : 'none')

        const records24h = allRecords.filter(
          (r) => {
            try {
              return new Date(r.checked_at) > new Date(now.getTime() - 24 * 60 * 60 * 1000)
            } catch (e) {
              return false
            }
          }
        )
        const records7d = allRecords.filter(
          (r) => {
            try {
              return new Date(r.checked_at) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            } catch (e) {
              return false
            }
          }
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
      } catch (monitorError) {
        console.error(`[dashboard] 处理监控 ${monitor.name} 失败:`, monitorError)
        // 即使失败也添加一个占位记录，避免整个页面崩溃
        result.monitors.push({
          name: monitor.name,
          url: monitor.url,
          status: "down",
          latency_ms: null,
          uptime_24h: 0,
          uptime_7d: 0,
          last_checked: "",
          last_error: `数据加载失败: ${monitorError}`,
          history_points: {},
        })
      }
    }

    console.log(`[dashboard] 请求完成，返回 ${result.monitors.length} 个监控`)
    return NextResponse.json(result)
  } catch (error) {
    console.error(`[dashboard] 请求异常:`, error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
