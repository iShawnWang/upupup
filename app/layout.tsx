import type { Metadata } from "next"
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google"
import { headers } from "next/headers"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import type { Locale } from "@/lib/i18n/types"

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const locale: Locale = (headersList.get("x-locale") as Locale) ?? "zh"

  const meta: Record<Locale, { title: string; description: string }> = {
    zh: {
      title: "upupup",
      description: "一个轻量的网站 / API 可用性监控面板",
    },
    en: {
      title: "upupup",
      description: "A lightweight website / API uptime monitoring dashboard",
    },
  }

  return meta[locale] ?? meta.zh
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersList = await headers()
  const locale: Locale = (headersList.get("x-locale") as Locale) ?? "zh"
  const htmlLang = locale === "zh" ? "zh-CN" : "en-US"

  return (
    <html lang={htmlLang} suppressHydrationWarning className={cn("font-mono", jetbrainsMono.variable)}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
