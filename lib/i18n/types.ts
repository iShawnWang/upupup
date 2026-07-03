export interface Translations {
  loading: string
  error: string
  noData: string
  total: string
  up: string
  down: string
  past: string
  now: string
  "site.subtitle": string
  "site.description": string
  "card.latency": string
  "card.uptime24h": string
  "card.uptime7d": string
  "card.lastStatus": string
  "card.ok": string
  "card.fail": string
  "card.recentError": string
  "hover.latency": string
  "hover.statusCode": string
  "hover.error": string
  "hover.noData": string
  "control.lastUpdate": string
  "control.autoRefresh": string
  "control.range.1h": string
  "control.range.12h": string
  "control.range.24h": string
  "control.range.30d": string
  "footer.copyright": string
  "footer.versionPrefix": string
  "meta.title": string
  "meta.description": string
}

export type Locale = "zh" | "en"

export const LOCALES: Locale[] = ["zh", "en"]

export const DEFAULT_LOCALE: Locale = "zh"

export const LOCALE_LABELS: Record<Locale, string> = {
  zh: "中文",
  en: "English",
}
