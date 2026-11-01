import { SEO_RULES } from "../../rules.js";
import { failure, success, warning } from "../result.js";
import type { SeoCheck } from "./types.js";

/** 3. Core metadata. */
export const metadataChecks: readonly SeoCheck[] = [
    {
        id: "title",
        run: (ctx) => {
            const title = ctx.title();
            const { length } = title;
            if (!length) return failure("Missing title tag");
            if (length < SEO_RULES.TITLE_MIN)
                return warning(
                    `Too short: ${length}/${SEO_RULES.TITLE_MIN}-${SEO_RULES.TITLE_MAX} chars`
                );
            if (length > SEO_RULES.TITLE_MAX)
                return warning(
                    `Too long: ${length}/${SEO_RULES.TITLE_MAX} chars (truncated in SERPs)`
                );
            return success(`${length} chars: ${title}`);
        }
    },
    {
        id: "metaDescription",
        run: (ctx) => {
            const meta = ctx.metaDescription();
            if (!meta) return failure("Missing meta description");
            const { length } = meta.content;
            if (length < SEO_RULES.DESCRIPTION_MIN)
                return warning(
                    `Too short: ${length}/${SEO_RULES.DESCRIPTION_MIN}-${SEO_RULES.DESCRIPTION_MAX} chars`
                );
            if (length > SEO_RULES.DESCRIPTION_MAX)
                return warning(
                    `Too long: ${length}/${SEO_RULES.DESCRIPTION_MAX} chars (truncated in SERPs)`
                );
            return success(`${length} chars: ${meta.content}`);
        }
    },
    {
        id: "metaKeywords",
        run: (ctx) => {
            const keywords = ctx.meta("name", "keywords");
            if (!keywords?.content) return success("Not used (obsolete for Google)");
            const count = keywords.content.split(",").filter((k) => k.trim()).length;
            if (count > SEO_RULES.KEYWORDS_MAX)
                return warning(`Excessive: ${count} > ${SEO_RULES.KEYWORDS_MAX}`);
            if (count < SEO_RULES.KEYWORDS_MIN)
                return warning(`Minimal: ${count} < ${SEO_RULES.KEYWORDS_MIN}`);
            return success(`${count} keywords`);
        }
    },
    {
        id: "metaAuthor",
        run: (ctx) => {
            if (ctx.pageType() !== "article") return success("N/A (non-article page)");
            const author = ctx.meta("name", "author");
            return author?.content
                ? success(`Author: ${author.content}`)
                : warning("Missing author meta (credibility for articles)");
        }
    }
];
