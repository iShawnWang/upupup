/**
 * Next.js Instrumentation Hook
 * 在 Web 进程启动时初始化运行时观测。
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startEventLoopDelayMonitor } = await import('@/lib/runtime-observability')
    startEventLoopDelayMonitor('web')
  }
}
