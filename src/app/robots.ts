import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        // Public pages only
        allow: ["/", "/menu", "/table/"],
        // Keep back-office, API, cart, and checkout private
        disallow: [
          "/admin/",
          "/kitchen/",
          "/waiter/",
          "/api/",
          "/cart",
          "/checkout",
          "/order-success",
        ],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
