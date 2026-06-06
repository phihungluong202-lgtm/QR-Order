import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // ── Titles ──────────────────────────────────────────────────────────────
  title: {
    default: "QR Order — Table Ordering",
    template: "%s | QR Order",
  },
  description:
    "Scan the QR code at your table, browse the menu, and order instantly. No app download needed.",
  applicationName: "QR Order",
  keywords: ["restaurant ordering", "QR menu", "table ordering", "dine-in", "food ordering"],
  authors: [{ name: "QR Order" }],
  creator: "QR Order",

  // ── Base URL for resolving relative OG/Twitter image paths ──────────────
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),

  // ── Open Graph ──────────────────────────────────────────────────────────
  openGraph: {
    title: "QR Order — Table Ordering",
    description: "Scan, browse & order directly from your table — no app needed.",
    type: "website",
    locale: "en_US",
    siteName: "QR Order",
    // Add /public/og-image.png (1200×630) for a rich link preview
    // images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "QR Order" }],
  },

  // ── Twitter / X card ────────────────────────────────────────────────────
  twitter: {
    card: "summary",
    title: "QR Order",
    description: "Table ordering made simple — scan, browse, order.",
    // images: ["/og-image.png"],
  },

  // ── Robots ──────────────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── PWA / iOS ────────────────────────────────────────────────────────────
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "QR Order",
  },
  formatDetection: { telephone: false },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e85d3a" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1412" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
