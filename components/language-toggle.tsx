"use client"

import * as React from "react"
import { Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/lib/i18n/context"
import type { Locale } from "@/lib/i18n/types"

export function LanguageToggle() {
  const { locale, setLocale, locales, localeLabels } = useI18n()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-full border-border/40 bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-all"
        >
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => setLocale(l as Locale)}
            className={locale === l ? "font-bold" : ""}
          >
            {localeLabels[l as Locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
