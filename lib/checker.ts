import { MonitorConfig } from "./config"
import { insertCheckRecord } from "./db"

export interface CheckResult {
  status: "up" | "down"
  latency_ms: number | null
  status_code: number | null
  keyword_ok: number | null
  error: string | null
}

export interface SavedCheckRecord {
  name: string
  status: "up" | "down"
  checked_at: string
  latency_ms: number | null
  status_code: number | null
  duration_ms: number
  db_duration_ms: number
  error: string | null
}

interface CheckContext {
  runId?: number
  trigger?: string
}

function errorSummary(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }
  return String(error)
}

function compactError(error: string | null) {
  if (!error) return null
  return error.replace(/\s+/g, " ").slice(0, 240)
}

export async function checkMonitor(monitor: MonitorConfig): Promise<CheckResult> {
  const controller = new AbortController()
  const timeoutMs = monitor.timeout ?? 30000
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const start = performance.now()
  let latency_ms: number | null = null
  let status_code: number | null = null
  let keyword_ok: number | null = null
  let error: string | null = null

  try {
    const res = await fetch(monitor.url, {
      method: monitor.method,
      signal: controller.signal,
    })
    latency_ms = Math.round(performance.now() - start)
    status_code = res.status

    let body = ""
    if (monitor.keyword) {
      body = await res.text()
      keyword_ok = body.includes(monitor.keyword) ? 1 : 0
    }

    const statusOk = status_code === monitor.expectedStatus
    const keywordCheckOk = monitor.keyword ? keyword_ok === 1 : true

    let errorMessage: string | null = null

    if (!statusOk || !keywordCheckOk) {
      const errorParts: string[] = []

      if (!statusOk) {
        errorParts.push(`状态码：期望 ${monitor.expectedStatus}，实际 ${status_code}`)
      }

      if (!keywordCheckOk && monitor.keyword) {
        errorParts.push(`关键词：未找到 "${monitor.keyword}"`)
      }

      errorParts.push(`请求：${monitor.method} ${monitor.url}`)
      errorParts.push(`超时：${timeoutMs}ms`)

      errorParts.push(`--- 响应头 ---`)
      res.headers.forEach((value, name) => {
        errorParts.push(`${name}: ${value}`)
      })

      if (!body && !monitor.keyword) {
        try {
          body = await res.text()
        } catch {
          body = '(无法读取响应体)'
        }
      }

      if (body) {
        errorParts.push(`--- 响应体 ---`)
        errorParts.push(body)
      }

      errorMessage = errorParts.join('\n')
    }

    return {
      status: statusOk && keywordCheckOk ? "up" : "down",
      latency_ms,
      status_code,
      keyword_ok,
      error: errorMessage,
    }
  } catch (e) {
    // 检查是否是超时错误
    if (e instanceof Error && (
      e.name === 'AbortError' ||
      e.message.includes('aborted') ||
      e.name === 'TimeoutError'
    )) {
      error = `请求超时（超过 ${timeoutMs / 1000} 秒未响应）`
    } else {
      error = e instanceof Error ? e.message : String(e)
    }

    return {
      status: "down",
      latency_ms,
      status_code,
      keyword_ok,
      error,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function checkAndSave(monitor: MonitorConfig, context: CheckContext = {}): Promise<SavedCheckRecord> {
  const runLabel = context.runId ?? "-"
  const checkStartedAt = new Date()
  const checkStart = performance.now()

  console.log(
    `[check] run=${runLabel} trigger=${context.trigger ?? "-"} name="${monitor.name}" start at=${checkStartedAt.toISOString()} method=${monitor.method} timeoutMs=${monitor.timeout ?? 30000}`
  )

  try {
    const result = await checkMonitor(monitor)
    const duration_ms = Math.round(performance.now() - checkStart)
    const now = new Date().toISOString()

    try {
      const dbStart = performance.now()
      insertCheckRecord({
        name: monitor.name,
        url: monitor.url,
        status: result.status,
        latency_ms: result.latency_ms,
        status_code: result.status_code,
        keyword_ok: result.keyword_ok,
        error: result.error,
        checked_at: now,
      })
      const db_duration_ms = Math.round(performance.now() - dbStart)
      console.log(
        `[check] run=${runLabel} name="${monitor.name}" saved status=${result.status} checked_at=${now} latencyMs=${result.latency_ms ?? "-"} statusCode=${result.status_code ?? "-"} durationMs=${duration_ms} dbDurationMs=${db_duration_ms} error=${compactError(result.error) ?? "-"}`
      )

      return {
        name: monitor.name,
        status: result.status,
        checked_at: now,
        latency_ms: result.latency_ms,
        status_code: result.status_code,
        duration_ms,
        db_duration_ms,
        error: result.error,
      }
    } catch (dbError) {
      console.error(
        `[check] run=${runLabel} name="${monitor.name}" db-write-failed checked_at=${now} durationMs=${duration_ms} error=${errorSummary(dbError)}`,
        dbError
      )
      throw dbError
    }
  } catch (error) {
    const duration_ms = Math.round(performance.now() - checkStart)
    console.error(
      `[check] run=${runLabel} name="${monitor.name}" failed durationMs=${duration_ms} error=${errorSummary(error)}`,
      error
    )
    throw error
  }
}
