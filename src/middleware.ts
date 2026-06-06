import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/env";

// ─── Security headers injected on every response ─────────────────────────────
// Note: The same set lives in next.config.ts headers() for full coverage.
// Middleware adds them dynamically so they appear even on edge-cached responses.
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "X-DNS-Prefetch-Control": "on",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

// HSTS only meaningful over HTTPS in production
if (process.env.NODE_ENV === "production") {
  SECURITY_HEADERS["Strict-Transport-Security"] =
    "max-age=63072000; includeSubDomains; preload";
}

export async function middleware(request: NextRequest) {
  let response: NextResponse;

  if (isSupabaseConfigured()) {
    // Supabase middleware refreshes the auth session cookie
    response = await updateSession(request);
  } else {
    response = NextResponse.next();
  }

  // Stamp security headers on every outbound response
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  // Run on all routes except static assets and Next.js internals
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2)$).*)",
  ],
};
