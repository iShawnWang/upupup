"use client"

import { DashboardView } from "@/components/dashboard-view"
import { useState, useEffect } from "react"
import type { DashboardResponse } from "@/app/api/dashboard/route"

export default function Home() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      if (!isMounted) return

      try {
        const res = await fetch("/api/dashboard", {
          cache: 'no-store'
        })
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        const data = await res.json()
        if (isMounted) {
          setData(data)
        }
      } catch (e) {
        // 忽略 AbortError
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error("Failed to fetch data:", e)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return (
      <div className="py-8 md:py-16 flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-8 md:py-16 flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">数据加载失败</div>
      </div>
    )
  }

  return (
    <div className="py-8 md:py-16">
      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-3 sm:gap-8 sm:px-6 lg:px-12">
        <DashboardView initialData={data} />
      </main>

      <footer className="mt-16 border-t border-border/40">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-4 px-3 py-6 sm:flex-row sm:px-6 lg:px-12">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} upupup. All rights reserved.
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/60 px-3 py-1 text-xs text-muted-foreground shadow-sm transition hover:border-border/80 hover:text-foreground">
            <span className="font-medium opacity-70">Ver.</span>
            <span className="font-mono">v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
