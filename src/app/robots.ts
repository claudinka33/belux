import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Zasebne in tehnične poti ne sodijo v Google
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/moji-termini",
          "/preklic/",
          "/prijava",
          "/registracija",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
