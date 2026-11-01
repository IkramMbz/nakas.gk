import { failure, info, success, warning } from "../result.js";
import type { SeoCheck } from "./types.js";

/** 2. Indexing and crawling. */
export const indexingChecks: readonly SeoCheck[] = [
    {
        id: "robotsMeta",
        run: (ctx) => {
            const robots = ctx.metaRobots();
            if (!robots) return success("Default indexing (no robots directive)");
            const directives = robots.content
                .toLowerCase()
                .split(",")
                .map((d) => d.trim());
            if (directives.includes("noindex"))
                return failure(`⚠️ NOINDEX active: ${robots.content}`);
            if (directives.includes("nofollow"))
                return warning(`NOFOLLOW active: ${robots.content}`);
            return success(robots.content);
        }
    },
    {
        id: "canonical",
        run: (ctx) => {
            const canonical = ctx.canonical();
            if (!canonical) return warning("Missing canonical URL");
            try {
                if (new URL(canonical.href).protocol !== "https:")
                    return warning("Canonical should use HTTPS");
                const target = canonical.href.split(/[?#]/)[0];
                if (!ctx.isLocalhost && target !== ctx.currentUrl) {
                    return warning(`Canonical mismatch: ${target}`);
                }
                return success(canonical.href);
            } catch {
                return failure("Invalid canonical URL");
            }
        }
    },
    // Server-side only: informational reminders.
    { id: "robotsTxt", run: () => info("Ensure a robots.txt is served at the site root") },
    { id: "sitemapXml", run: () => info("Ensure a sitemap.xml is served at the site root") }
];
