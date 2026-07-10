"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useHydrated } from "@/hooks/use-hydrated"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const mounted = useHydrated()

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-border/40 bg-background/60 backdrop-blur-sm">
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    // 保存到 localStorage（next-themes 会自动处理，但显式保存更安全）
    localStorage.setItem("theme", newTheme)
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9 rounded-full border-border/40 bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-all"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
