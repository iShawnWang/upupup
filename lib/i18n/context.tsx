"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import type { Translations, Locale } from "./types"
import { LOCALES, DEFAULT_LOCALE, LOCALE_LABELS } from "./types"
import zh from "./zh.json"
import en from "./en.json"

const translations: Record<Locale, Translations> = { zh, en }

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE

  // 1. Check cookie first
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/)
  if (match && LOCALES.includes(match[1] as Locale)) {
    return match[1] as Locale
  }

  // 2. Auto-detect from browser
  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith("zh")) return "zh"
  if (browserLang.startsWith("en")) return "en"

  return DEFAULT_LOCALE
}

function setLocaleCookie(locale: Locale) {
  document.cookie = `locale=${locale};path=/;max-age=31536000;SameSite=Lax`
}

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: keyof Translations, params?: Record<string, string | number>) => string
  locales: Locale[]
  localeLabels: Record<Locale, string>
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setLocaleState(getInitialLocale())
    setMounted(true)
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    setLocaleCookie(newLocale)
    // Update html lang attribute
    document.documentElement.lang = newLocale === "zh" ? "zh-CN" : "en-US"
  }, [])

  const t = useCallback(
    (key: keyof Translations, params?: Record<string, string | number>): string => {
      let text = translations[locale][key] ?? translations[DEFAULT_LOCALE][key] ?? key
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(`{${k}}`, String(v))
        }
      }
      return text
    },
    [locale]
  )

  // Avoid hydration mismatch: render with DEFAULT_LOCALE until mounted
  const value: I18nContextValue = {
    locale: mounted ? locale : DEFAULT_LOCALE,
    setLocale,
    t: mounted ? t : ((key, params) => {
      let text = translations[DEFAULT_LOCALE][key] ?? key
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(`{${k}}`, String(v))
        }
      }
      return text
    }),
    locales: LOCALES,
    localeLabels: LOCALE_LABELS,
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return ctx
}
