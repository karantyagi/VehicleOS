import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Design preview routes are local-dev only — not served in production. */
export function middleware(_request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/design-preview", "/design-preview/:path*"],
};
