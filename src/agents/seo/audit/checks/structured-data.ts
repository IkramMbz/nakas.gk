import { info, success, warning } from "../result.js";
import type { SeoContext } from "../context.js";
import type { SeoCheck } from "./types.js";

const hasAny = (ctx: SeoContext, wanted: readonly string[]): boolean =>
    wanted.some((type) => ctx.schemaInfo().types.has(type));

/** 11. Structured data (JSON-LD). */
export const structuredDataChecks: readonly SeoCheck[] = [
    {
        id: "structuredData",
        run: (ctx) => {
            const { count, valid, invalid } = ctx.schemaInfo();
            if (count === 0) return info("No structured data (Schema.org recommended)");
            return invalid > 0
                ? warning(`${valid} valid, ${invalid} invalid`)
                : success(`${valid} valid JSON-LD schema(s)`);
        }
    },
    {
        id: "schemaOrganization",
        run: (ctx) =>
            info(
                hasAny(ctx, ["Organization", "LocalBusiness"])
                    ? "Organization schema present"
                    : "Consider adding Organization schema"
            )
    },
    {
        id: "breadcrumbSchema",
        run: (ctx) =>
            info(
                hasAny(ctx, ["BreadcrumbList"])
                    ? "Breadcrumb schema present"
                    : "Consider adding BreadcrumbList schema"
            )
    },
    {
        id: "schemaArticle",
        run: (ctx) => {
            if (ctx.pageType() !== "article") return success("N/A (non-article page)");
            return hasAny(ctx, ["Article", "BlogPosting", "NewsArticle", "TechArticle"])
                ? success("Article schema present")
                : warning("Missing Article schema (og:type=article)");
        }
    },
    {
        id: "schemaProduct",
        run: (ctx) => {
            if (ctx.pageType() !== "product") return success("N/A (non-product page)");
            return hasAny(ctx, ["Product", "Offer"])
                ? success("Product schema present")
                : warning("Missing Product schema (og:type=product)");
        }
    },
    {
        id: "schemaFAQ",
        run: (ctx) => {
            const hasSchema = hasAny(ctx, ["FAQPage"]);
            const text = ctx.body.textContent?.toLowerCase() || "";
            const hasFaqContent = /\b(faq|questions? (fréquentes?|frequently asked))\b/i.test(text);
            if (hasFaqContent && !hasSchema)
                return warning("FAQ content detected (add FAQ schema)");
            return success(hasSchema ? "FAQ schema present" : "N/A");
        }
    }
];
