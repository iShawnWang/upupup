import { NextResponse, NextRequest } from "next/server"
import {
  CheckRecord,
  getCheckRecordsSince,
  getLatestCheckRecord,
  getUptimeCounts,
} from "@/lib/db"
import { getMonitorsFromEnv } from "@/lib/config"
import { formatDate } from "@/lib/utils"
import { TIME_RANGES } from "@/lib/time-ranges"

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

function calculateUptimeFromCounts(total: number, up: number): number {
  if (total === 0) return 0
  return Math.round((up / total) * 100)
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

  const buckets = new Map<number, {
    hasDown: boolean
    firstRecord: CheckRecord | null
    firstDownRecord: CheckRecord | null
  }>()

  for (const record of records) {
    try {
      const recordTime = new Date(record.checked_at)
      if (recordTime < startTimeAligned || recordTime > nowAligned) {
        continue
      }

      const bucketTime = alignToGranularity(recordTime, granularityMs).getTime()
      let bucket = buckets.get(bucketTime)
      if (!bucket) {
        bucket = {
          hasDown: false,
          firstRecord: null,
          firstDownRecord: null,
        }
        buckets.set(bucketTime, bucket)
      }

      bucket.firstRecord ??= record
      if (record.status === "down") {
        bucket.hasDown = true
        bucket.firstDownRecord ??= record
      }
    } catch (e) {
      console.warn(`[dashboard] 日期解析失败:`, record.checked_at, e)
    }
  }

  // 按粒度聚合
  const points: HistoryPoint[] = []

  let currentTime = new Date(startTimeAligned)
  while (currentTime < nowAligned) {
    // 聚合该时间段的记录
    const aggregatedPoint: HistoryPoint = {
      time: currentTime.toISOString(),
      status: null,
      latency_ms: null,
      status_code: null,
      error: null,
    }

    const bucket = buckets.get(currentTime.getTime())
    if (bucket) {
      const representativeRecord = bucket.hasDown ? bucket.firstDownRecord : bucket.firstRecord
      aggregatedPoint.status = bucket.hasDown ? 'down' : 'up'
      aggregatedPoint.latency_ms = representativeRecord?.latency_ms ?? null
      aggregatedPoint.status_code = representativeRecord?.status_code ?? null
      aggregatedPoint.error = representativeRecord?.error ?? null
    }

    points.push(aggregatedPoint)

    currentTime = new Date(currentTime.getTime() + granularityMs)
  }

  return points
}

export async function GET(request: NextRequest) {
  const requestStartedAt = performance.now()
  console.log(`[dashboard] 收到请求: ${request.url}`)

  try {
    const { searchParams } = new URL(request.url)
    const requestedRanges = searchParams.getAll('range')

    const monitors = getMonitorsFromEnv()
    const now = new Date()

    console.log(`[dashboard] 处理 ${monitors.length} 个监控目标`)

    const result: DashboardResponse = {
      monitors: [],
      updated_at: now.toISOString(),
      time_ranges: TIME_RANGES,
    }

    // 确定需要聚合哪些时间范围：无 range 参数时返回全部，range 无效时回退到默认范围。
    const requestedRangesToAggregate = requestedRanges.length > 0
      ? TIME_RANGES.filter(r => requestedRanges.includes(r.id))
      : TIME_RANGES // 默认返回所有
    const rangesToAggregate = requestedRangesToAggregate.length > 0
      ? requestedRangesToAggregate
      : TIME_RANGES.filter(r => r.default)
    const maxHistoryRangeMs = Math.max(...rangesToAggregate.map(r => r.rangeMs))
    const historySince = new Date(now.getTime() - maxHistoryRangeMs).toISOString()
    const uptime24hSince = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const uptime7dSince = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    for (const monitor of monitors) {
      try {
        console.log(`[dashboard] 处理监控: ${monitor.name}`)

        let historyRecords: CheckRecord[] = []
        let latest: CheckRecord | undefined
        let uptime24h = 0
        let uptime7d = 0
        try {
          latest = getLatestCheckRecord(monitor.name)
          historyRecords = getCheckRecordsSince(monitor.name, historySince)
          const uptime24hCounts = getUptimeCounts(monitor.name, uptime24hSince)
          const uptime7dCounts = getUptimeCounts(monitor.name, uptime7dSince)
          uptime24h = calculateUptimeFromCounts(uptime24hCounts.total, uptime24hCounts.up ?? 0)
          uptime7d = calculateUptimeFromCounts(uptime7dCounts.total, uptime7dCounts.up ?? 0)
          console.log(`[dashboard] ${monitor.name}: history=${historyRecords.length}, since=${formatLogTime(historySince)}`)
        } catch (dbError) {
          console.error(`[dashboard] ${monitor.name} 数据库查询失败:`, dbError)
        }

        if (!latest && historyRecords.length > 0) {
          latest = historyRecords[0]
        }
        console.log(`[dashboard] ${monitor.name}: latest=`, latest ? { status: latest.status, time: formatLogTime(latest.checked_at) } : 'none')

        // 聚合各种时间范围的数据
        const history_points: { [key: string]: HistoryPoint[] } = {}
        for (const range of rangesToAggregate) {
          history_points[range.id] = aggregateRecords(historyRecords, range.rangeMs, range.granularityMs, now)
        }

        result.monitors.push({
          name: monitor.name,
          url: monitor.url,
          status: latest?.status || "down",
          latency_ms: latest?.latency_ms || null,
          uptime_24h: uptime24h,
          uptime_7d: uptime7d,
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

    console.log(`[dashboard] 请求完成，返回 ${result.monitors.length} 个监控，durationMs=${Math.round(performance.now() - requestStartedAt)}`)
    return NextResponse.json(result)
  } catch (error) {
    console.error(`[dashboard] 请求异常:`, error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
