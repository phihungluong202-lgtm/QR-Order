import { type NextRequest, NextResponse } from "next/server";

// ─── Security headers ─────────────────────────────────────────────────────────
// Supabase session refresh is handled in server components/layouts instead
// to avoid importing @supabase/supabase-js in the Edge runtime (Next.js 15).
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "X-DNS-Prefetch-Control": "on",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

export function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2)$).*)",
  ],
};
