"use client"

import type { HistoryPoint } from "@/app/api/dashboard/route"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

interface HistoryGridProps {
  history_points: {
    [rangeId: string]: HistoryPoint[]
  }
  selectedRangeId: string
}

function getStatusColor(status: string | null) {
  if (status === "up") return "bg-emerald-500"
  if (status === "down") return "bg-red-500"
  return "bg-muted-foreground/10"
}

function formatTime(dateStr: string, locale: string) {
  const date = new Date(dateStr)
  const lang = locale === "zh" ? "zh-CN" : "en-US"
  return date.toLocaleString(lang)
}

export function HistoryGrid({ history_points, selectedRangeId }: HistoryGridProps) {
  const { t, locale } = useI18n()
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
                aria-label={`${formatTime(point.time, locale)}: ${point.status || t("noData")}`}
              />
            </HoverCardTrigger>
            <HoverCardContent
              side="top"
              className="w-96 space-y-2 rounded-xl border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  {formatTime(point.time, locale)}
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
                      <span className="text-muted-foreground">{t("hover.latency")}</span>
                      <span className="font-mono font-medium">
                        {point.latency_ms ? `${point.latency_ms}ms` : "—"}
                      </span>
                    </div>
                    {point.status_code && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("hover.statusCode")}</span>
                        <span className="font-mono font-medium">{point.status_code}</span>
                      </div>
                    )}
                    {point.error && (
                      <div className="pt-1">
                        <span className="text-muted-foreground text-[10px]">{t("hover.error")}</span>
                        <pre className="text-red-400 text-[11px] whitespace-pre-wrap break-all mt-1 font-mono leading-relaxed">
                          {point.error}
                        </pre>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground text-[10px]">{t("hover.noData")}</div>
                )}
              </div>
            </HoverCardContent>
          </HoverCard>
        ))}
        </div>
      </div>

      <div className="flex justify-between text-[9px] font-medium uppercase tracking-widest text-muted-foreground/50">
        <span>{t("past")}</span>
        <span>{t("now")}</span>
      </div>
    </div>
  )
}
