import { NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { isResearchCohortSurface } from "./lib/research-import/policy";

export async function middleware(request: import("next/server").NextRequest) {
  if (isResearchCohortSurface()) {
    const pathname = request.nextUrl.pathname;
    const allowed =
      pathname === "/" ||
      pathname === "/login" ||
      pathname.startsWith("/auth/") ||
      pathname === "/api/health" ||
      pathname.startsWith("/api/research/");
    if (!allowed) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon).*)",
  ],
};
