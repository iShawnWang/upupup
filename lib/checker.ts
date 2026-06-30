import { MonitorConfig } from "./config"
import { insertCheckRecord } from "./db"

export interface CheckResult {
  status: "up" | "down"
  latency_ms: number | null
  status_code: number | null
  keyword_ok: number | null
  error: string | null
}

export async function checkMonitor(monitor: MonitorConfig): Promise<CheckResult> {
  const controller = new AbortController()
  const timeoutMs = monitor.timeout
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

    return {
      status: statusOk && keywordCheckOk ? "up" : "down",
      latency_ms,
      status_code,
      keyword_ok,
      error: null,
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

export async function checkAndSave(monitor: MonitorConfig) {
  const result = await checkMonitor(monitor)
  const now = new Date().toISOString()
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
  console.log(`[check] ${monitor.name} ${result.status} ${result.latency_ms}ms`)
}
