"use client"

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { HistoryPoint } from "@/app/api/dashboard/route"
import { cn } from "@/lib/utils"

interface HistoryGridProps {
  history_points: {
    [rangeId: string]: HistoryPoint[]
  }
  time_ranges?: any[]
  selectedRangeId: string
}

function getStatusColor(status: string | null) {
  if (status === "up") return "bg-emerald-500"
  if (status === "down") return "bg-red-500"
  return "bg-muted-foreground/10"
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleString("zh-CN")
}

export function HistoryGrid({ history_points, time_ranges = [], selectedRangeId }: HistoryGridProps) {
  // 获取当前选择范围的数据
  const segments = history_points[selectedRangeId] || []

  return (
    <div className="space-y-3">
      <div className="relative h-8 w-full overflow-x-auto overflow-y-hidden rounded-sm bg-muted/20 scrollbar-hide">
        <div className="flex h-full w-full gap-[2px] p-[2px]">
        {segments.map((point, idx) => (
          <HoverCard key={idx}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                className={cn(
                  "relative block h-full flex-1 min-w-[6px] rounded-[1px] transition-all duration-200 hover:scale-y-110 hover:opacity-80",
                  getStatusColor(point.status)
                )}
                aria-label={`${point.time}: ${point.status || '无数据'}`}
              />
            </HoverCardTrigger>
            <HoverCardContent
              side="top"
              className="w-64 space-y-2 rounded-xl border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  {formatTime(point.time)}
                </Badge>
                {point.status && (
                  <Badge
                    variant={point.status === "up" ? "success" : "destructive"}
                    className="h-5 px-1.5 text-[10px]"
                  >
                    {point.status.toUpperCase()}
                  </Badge>
                )}
              </div>
              <div className="grid gap-1 text-xs">
                {point.status ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">延迟</span>
                      <span className="font-mono font-medium">
                        {point.latency_ms ? `${point.latency_ms}ms` : "—"}
                      </span>
                    </div>
                    {point.status_code && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">状态码</span>
                        <span className="font-mono font-medium">{point.status_code}</span>
                      </div>
                    )}
                    {point.error && (
                      <div className="pt-1">
                        <span className="text-muted-foreground text-[10px]">错误</span>
                        <p className="text-red-500 text-[10px] break-all mt-1">
                          {point.error}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground text-[10px]">无数据</div>
                )}
              </div>
            </HoverCardContent>
          </HoverCard>
        ))}
        </div>
      </div>

      <div className="flex justify-between text-[9px] font-medium uppercase tracking-widest text-muted-foreground/50">
        <span>Past</span>
        <span>Now</span>
      </div>
    </div>
  )
}
