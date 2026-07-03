"use client"

import { Globe2, Radio, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { HistoryGrid } from "./history-grid"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

const formatLatency = (value: number | null | undefined) =>
  typeof value === "number" ? `${value} ms` : "—"

interface StatusCardProps {
  monitor: any
  time_ranges?: any[]
  selectedRangeId: string
}

export function StatusCard({ monitor, time_ranges = [], selectedRangeId }: StatusCardProps) {
  const { t } = useI18n()
  const isUp = monitor.status === "up"

  return (
    <div className={cn(
      "group relative flex flex-col overflow-hidden rounded-2xl border bg-background/40 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5",
      !isUp ? "border-red-500/20" : "border-border/40 hover:border-primary/20"
    )}>
      <div className="flex-1 p-4 sm:p-5">
        <div className="mb-4">
          <h3 className="line-clamp-2 text-base font-bold leading-tight tracking-tight text-foreground sm:text-lg md:text-xl lg:text-2xl">
            {monitor.name}
          </h3>

          <div className="mt-2.5 flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/80 to-white/20 shadow-sm ring-1 ring-black/5 transition-transform group-hover:scale-105 dark:from-white/10 dark:to-white/5 dark:ring-white/10 sm:h-12 sm:w-12 sm:rounded-2xl">
              <Globe2 className="h-5 w-5 text-foreground/80 sm:h-6 sm:w-6" />
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-semibold text-foreground/70">
                HTTP
              </span>
              <span className="min-w-0 truncate font-mono font-medium text-foreground/50">
                {monitor.url}
              </span>
            </div>
            <Badge
              variant={isUp ? "success" : "destructive"}
              className="shrink-0 whitespace-nowrap rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shadow-sm backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-xs"
            >
              {isUp ? "UP" : "DOWN"}
            </Badge>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/30 p-3 transition-colors group-hover:bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">{t("card.latency")}</span>
            </div>
            <div className="mt-1 font-mono text-lg font-medium leading-none text-foreground">
              {formatLatency(monitor.latency_ms)}
            </div>
          </div>

          <div className="rounded-xl bg-muted/30 p-3 transition-colors group-hover:bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Radio className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">{t("card.uptime24h")}</span>
            </div>
            <div className="mt-1 font-mono text-lg font-medium leading-none text-foreground">
              {monitor.uptime_24h}%
            </div>
          </div>
        </div>

        <div className="border-t border-border/30 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/30 p-3 transition-colors group-hover:bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Radio className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">{t("card.uptime7d")}</span>
              </div>
              <div className="mt-1 font-mono text-lg font-medium leading-none text-foreground">
                {monitor.uptime_7d}%
              </div>
            </div>
            <div className="rounded-xl bg-muted/30 p-3 transition-colors group-hover:bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Radio className="h-3.5 w-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">{t("card.lastStatus")}</span>
              </div>
              <div className={cn(
                "mt-1 font-mono text-lg font-medium uppercase leading-none",
                isUp ? "text-emerald-500" : "text-red-500"
              )}>
                {isUp ? t("card.ok") : t("card.fail")}
              </div>
            </div>
          </div>
          {!isUp && monitor.last_error && (
            <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
              <div className="flex items-center gap-2 text-red-500 text-[10px] font-semibold uppercase tracking-wider mb-2">
                {t("card.recentError")}
              </div>
              <pre className="text-red-400 text-[11px] whitespace-pre-wrap break-all font-mono leading-relaxed">
                {monitor.last_error}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border/40 bg-muted/10 px-5 py-4">
        <HistoryGrid
          history_points={monitor.history_points}
          time_ranges={time_ranges}
          selectedRangeId={selectedRangeId}
        />
      </div>
    </div>
  )
}
