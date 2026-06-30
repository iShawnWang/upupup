/**
 * Next.js Instrumentation Hook
 * 在服务器启动时初始化后台轮询器
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@/lib/cron')
    const { startCron } = await import('@/lib/cron')
    startCron()
  }
}
