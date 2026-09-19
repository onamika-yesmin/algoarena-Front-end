import type { MetadataRoute } from "next";
import { appConfig } from "@/lib/config";

/** Only the two routes a signed-out crawler can actually render. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${appConfig.appUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${appConfig.appUrl}/signin`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];
}
