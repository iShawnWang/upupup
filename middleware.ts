import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const VALID_LOCALES = ["zh", "en"]

export function middleware(request: NextRequest) {
  const cookieLocale = request.cookies.get("upupup-locale")?.value
  const locale = VALID_LOCALES.includes(cookieLocale ?? "") ? cookieLocale! : "zh"

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-locale", locale)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
