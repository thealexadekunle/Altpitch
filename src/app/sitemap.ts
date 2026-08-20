import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Public marketing pages only — authenticated app routes are noindex'd (see security-headers.ts)
// and have no organic search value.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/pricing", "/terms", "/privacy", "/blog", "/login", "/signup"];
  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.6,
  }));
}
