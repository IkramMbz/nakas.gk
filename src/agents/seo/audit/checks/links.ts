import { fromWarnings, info, success, warning } from "../result.js";
import { isExternal, isInternal, type SeoCheck } from "./types.js";

/** 7. Links. */
export const linkChecks: readonly SeoCheck[] = [
    {
        id: "links",
        run: (ctx) => {
            const links = ctx.links();
            if (links.length === 0) return warning("No links found");
            const internal = links.filter((a) => isInternal(a, ctx));
            const external = links.filter((a) => isExternal(a, ctx));
            const broken = links.filter(
                (a) => !a.href || a.href === "#" || a.href.startsWith("javascript:")
            );
            const warnings: string[] = [];
            if (internal.length === 0) warnings.push("No internal links");
            if (broken.length > 0) warnings.push(`${broken.length} broken links`);
            return fromWarnings(
                warnings,
                `Internal: ${internal.length}, External: ${external.length}`
            );
        }
    },
    {
        id: "externalLinksSecurity",
        run: (ctx) => {
            const external = ctx.links().filter((a) => isExternal(a, ctx));
            if (external.length === 0) return success("No external links");
            const unsafe = external.filter(
                (a) =>
                    a.target === "_blank" &&
                    (!a.rel.includes("noopener") || !a.rel.includes("noreferrer"))
            );
            return unsafe.length > 0
                ? info(`${unsafe.length} missing noopener/noreferrer (security)`)
                : info(`${external.length} secure external links`);
        }
    }
];

/** 8. Internationalization. */
export const i18nChecks: readonly SeoCheck[] = [
    {
        id: "hreflang",
        run: (ctx) => {
            const alternates = ctx.hreflangLinks();
            if (alternates.length === 0) return success("Monolingual (no hreflang needed)");
            const selfReferencing = alternates.some((link) => {
                try {
                    return new URL(link.href).pathname === ctx.loc.pathname;
                } catch {
                    return false;
                }
            });
            const hasDefault = alternates.some(
                (link) => link.getAttribute("hreflang") === "x-default"
            );
            const warnings: string[] = [];
            if (!selfReferencing) warnings.push("Missing self-referencing hreflang");
            if (!hasDefault && alternates.length > 1) warnings.push("Missing x-default");
            return fromWarnings(warnings, `${alternates.length} hreflang tags`);
        }
    }
];
