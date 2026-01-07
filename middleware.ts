import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard")
  const isOnAuthPage =
    req.nextUrl.pathname === "/login" ||
    req.nextUrl.pathname === "/register"
  const isOnSharePage = req.nextUrl.pathname.startsWith("/share")
  const isOnApiAuth = req.nextUrl.pathname.startsWith("/api/auth")

  // Pages publiques
  if (isOnSharePage || isOnApiAuth) {
    return NextResponse.next()
  }

  // Rediriger vers login si non connecté et sur dashboard
  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  // Rediriger vers dashboard si connecté et sur page auth
  if (isOnAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
