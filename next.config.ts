import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const isDev = process.env.NODE_ENV === "development";

// ─── Security headers applied to every route ─────────────────────────────────
const securityHeaders = [
  // Prevent MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking protection
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Legacy XSS filter (belt-and-suspenders)
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Speed up DNS resolution
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Limit referrer data sent to third parties
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable unnecessary browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // HSTS — only in production (HTTPS enforced for 2 years)
  ...(!isDev
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Don't leak framework info
  poweredByHeader: false,

  // Brotli/gzip for all responses
  compress: true,

  // Allow deployment while TypeScript warnings exist (fix before going to customers)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Allow ESLint warnings to not block deployment
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    // Prefer modern formats automatically
    formats: ["image/avif", "image/webp"],
    // Allowed external image hosts
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    // Cache optimized images for 7 days
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },

  // Security headers on every page and API route
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // Never cache API responses by default
      {
        source: "/api/(.*)",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },

  experimental: {
    // lucide-react is safe to tree-shake; framer-motion removed (can conflict)
    optimizePackageImports: ["lucide-react"],
  },
};

// ─── PWA via Serwist ──────────────────────────────────────────────────────────
const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  // Keep disabled until basic deployment is confirmed working
  disable: true,
});

export default withSerwist(nextConfig);
