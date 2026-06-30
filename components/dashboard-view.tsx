"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, RefreshCcw } from "lucide-react"
import { StatusCard } from "./status-card"
import type { DashboardResponse } from "@/app/api/dashboard/route"
import { Button } from "./ui/button"

export function DashboardView({ initialData }: { initialData: DashboardResponse }) {
  const [data, setData] = useState<DashboardResponse>(initialData)
  const [selectedRangeId, setSelectedRangeId] = useState<string>(() => {
    // 优先从 localStorage 读取，如果没有则使用默认
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("upupup-selected-range")
      if (saved) {
        // 检查保存的 id 是否在当前时间范围列表中
        const exists = data.time_ranges?.some(r => r.id === saved)
        if (exists) {
          return saved
        }
      }
    }
    const defaultRange = data.time_ranges?.find(r => r.default)
    return defaultRange?.id || data.time_ranges?.[0]?.id || "1h"
  })

  // 当选择变化时保存到 localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("upupup-selected-range", selectedRangeId)
    }
  }, [selectedRangeId])

  const summary = useMemo(() => {
    const up = data.monitors.filter((monitor) => monitor.status === "up").length
    return {
      up,
      down: data.monitors.length - up,
      total: data.monitors.length,
    }
  }, [data.monitors])

  useEffect(() => {
    let isMounted = true
    let intervalId: any = null

    const fetchData = async () => {
      if (!isMounted) return

      try {
        const res = await fetch("/api/dashboard", {
          cache: "no-store"
        })
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        const newData = await res.json()
        if (isMounted) {
          setData(newData)
        }
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          console.error("Failed to fetch dashboard data", e)
        }
      }
    }

    fetchData()

    intervalId = setInterval(fetchData, 30000)

    return () => {
      isMounted = false
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [])

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <header className="flex flex-col gap-4 rounded-3xl border bg-white/30 p-4 backdrop-blur-sm dark:bg-black/10 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Activity className="h-3.5 w-3.5 text-primary" />
            网站 / API 可用性监控
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            upupup
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            实时检测站点可用性、响应延迟和近期在线率。
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-3">
          <div className="rounded-2xl border border-border/40 bg-background/60 px-3 py-2 text-center shadow-sm sm:min-w-24">
            <div className="font-mono text-lg font-semibold text-foreground">{summary.total}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-center shadow-sm sm:min-w-24">
            <div className="font-mono text-lg font-semibold text-emerald-500">{summary.up}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/80">Up</div>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-center shadow-sm sm:min-w-24">
            <div className="font-mono text-lg font-semibold text-red-500">{summary.down}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-red-600/80 dark:text-red-400/80">Down</div>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          最后更新: {new Date(data.updated_at).toLocaleString("zh-CN")}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            {data.time_ranges?.map((range) => (
              <Button
                key={range.id}
                variant={selectedRangeId === range.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedRangeId(range.id)}
                className={
                  selectedRangeId === range.id
                    ? "text-xs h-7 px-3 py-1 bg-primary text-primary-foreground"
                    : "text-xs h-7 px-3 py-1 text-muted-foreground hover:text-foreground"
                }
              >
                {range.label}
              </Button>
            ))}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/60 px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <RefreshCcw className="h-3.5 w-3.5" />
            每 30 秒自动刷新
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-5">
        {data.monitors.map((monitor) => (
          <StatusCard
            key={monitor.name}
            monitor={monitor}
            time_ranges={data.time_ranges}
            selectedRangeId={selectedRangeId}
          />
        ))}
      </div>
    </div>
  )
}
