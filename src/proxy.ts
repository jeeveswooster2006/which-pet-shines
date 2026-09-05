import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/constants";

// Coarse, fast, Edge-safe first line of defense: no admin cookie at all ->
// straight to the login page, before any page code or DB call runs. This is
// deliberately cheap (presence-only) — the actual HMAC signature + expiry
// check happens server-side in requireAdmin() (src/lib/auth/adminAuth.ts),
// which every admin page and admin API route calls too. Two layers because
// this is the one part of the site that must never be left open.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const hasCookie = request.cookies.has(ADMIN_COOKIE_NAME);
    if (!hasCookie) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
