import { SEO_RULES } from "../../rules.js";
import { failure, success, warning } from "../result.js";
import type { SeoCheck } from "./types.js";

const OG_TYPES = ["website", "article", "product", "video.movie", "music.song", "book"];
const TWITTER_CARDS = ["summary", "summary_large_image", "app", "player"];

/** Checks that an image URL parses and uses HTTPS. */
function checkImageUrl(raw: string, base: string, label: string) {
    try {
        return new URL(raw, base).protocol === "https:"
            ? null
            : warning(`${label} should use HTTPS`);
    } catch {
        return failure(`Invalid ${label} URL`);
    }
}

/** 9. Open Graph. */
export const openGraphChecks: readonly SeoCheck[] = [
    {
        id: "ogTitle",
        run: (ctx) => {
            const og = ctx.ogTitle();
            return og?.content ? success(og.content.slice(0, 60)) : warning("Missing og:title");
        }
    },
    {
        id: "ogDescription",
        run: (ctx) => {
            const content = ctx.ogDescription()?.content;
            if (!content) return warning("Missing og:description");
            if (content.length < 50) return warning(`Too short: ${content.length} chars`);
            return success(content.slice(0, SEO_RULES.OG_PREVIEW_LENGTH));
        }
    },
    {
        id: "ogImage",
        run: (ctx) => {
            const content = ctx.ogImage()?.content;
            if (!content) return warning("Missing og:image");
            return checkImageUrl(content, ctx.loc.href, "og:image") ?? success(content);
        }
    },
    {
        id: "ogType",
        run: (ctx) => {
            const type = ctx.ogType()?.content;
            if (!type) return warning("Missing og:type");
            return OG_TYPES.includes(type)
                ? success(`Type: ${type}`)
                : warning(`Non-standard type: ${type}`);
        }
    },
    {
        id: "ogUrl",
        run: (ctx) => {
            const ogUrl = ctx.meta("property", "og:url")?.content;
            if (!ogUrl) return warning("Missing og:url");
            const canonical = ctx.canonical()?.href;
            if (canonical && !ctx.isLocalhost && ogUrl !== canonical)
                return warning("og:url differs from canonical");
            try {
                if (!ctx.isLocalhost && new URL(ogUrl).protocol !== "https:")
                    return warning("og:url should use HTTPS");
            } catch {
                return failure("Invalid og:url");
            }
            return success("Consistent with canonical");
        }
    },
    {
        id: "ogSiteName",
        run: (ctx) => {
            const name = ctx.meta("property", "og:site_name")?.content;
            return name ? success(name) : warning("Missing og:site_name");
        }
    },
    {
        id: "ogLocale",
        run: (ctx) => {
            const locale = ctx.meta("property", "og:locale")?.content;
            if (!locale) return warning("Missing og:locale");
            const lang = ctx.docElement.lang;
            if (lang && !locale.toLowerCase().startsWith(lang.toLowerCase().split("-")[0] ?? "")) {
                return warning(`Inconsistent with lang="${lang}"`);
            }
            return success(locale);
        }
    }
];

/** 10. Cartes Twitter / X. */
export const twitterChecks: readonly SeoCheck[] = [
    {
        id: "twitterCard",
        run: (ctx) => {
            const card = ctx.meta("name", "twitter:card")?.content;
            if (!card) return warning("Missing Twitter Card");
            if (!TWITTER_CARDS.includes(card)) return warning(`Invalid card type: ${card}`);
            const site = ctx.meta("name", "twitter:site")?.content;
            return success(`${card}${site ? ` @${site}` : ""}`);
        }
    },
    {
        id: "twitterImage",
        run: (ctx) => {
            const image = ctx.meta("name", "twitter:image")?.content;
            if (!image) return success("Fallback to og:image");
            return (
                checkImageUrl(image, ctx.loc.href, "twitter:image") ??
                success("Twitter image defined")
            );
        }
    }
];
