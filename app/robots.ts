import type { MetadataRoute } from "next";
import { appConfig } from "@/lib/config";

/**
 * Everything except the homepage and the sign-in page is behind an auth
 * gate, so a crawler that follows those links only ever reaches the sign-in
 * redirect. Keeping them out of the index avoids filling search results with
 * near-identical "Checking your session…" pages.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/signin"],
      disallow: ["/admin", "/profile", "/analytics", "/submissions", "/host", "/interview", "/api/"],
    },
    sitemap: `${appConfig.appUrl}/sitemap.xml`,
  };
}
