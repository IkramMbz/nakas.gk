import { SEO_RULES } from "../../rules.js";
import { fromWarnings, info, success, warning } from "../result.js";
import { onContent } from "./types.js";
const COOKIE_TOOLS = [
    "cookiebot",
    "onetrust",
    "quantcast",
    "cookieconsent",
    "tarteaucitron",
    "axeptio",
    "cookiefirst",
    "glitch-cookies"
];
const MIN_TOUCH_TARGET = 44;
const MIN_FONT_PX = 16;
const escapeId = (id) => (typeof CSS !== "undefined" ? CSS.escape(id) : id);
/** 12. Performance. */
export const performanceChecks = [
    {
        id: "criticalResources",
        run: (ctx) => {
            const blockingCss = ctx.doc.querySelectorAll('link[rel="stylesheet"]:not([media]), link[rel="stylesheet"][media="all"]');
            const blockingScripts = ctx
                .scripts()
                .filter((s) => !s.hasAttribute("async") && !s.hasAttribute("defer"));
            const warnings = [];
            if (blockingCss.length > SEO_RULES.RESOURCES_MAX_CSS_SCRIPTS)
                warnings.push(`${blockingCss.length} render-blocking CSS`);
            if (blockingScripts.length > SEO_RULES.RESOURCES_MAX_BLOCKING_SCRIPTS)
                warnings.push(`${blockingScripts.length} render-blocking scripts`);
            return fromWarnings(warnings, "Critical resources optimized");
        }
    },
    {
        id: "resourceHints",
        run: ({ doc }) => {
            const count = (rel) => doc.querySelectorAll(`link[rel="${rel}"]`).length;
            const [preconnect, dnsPrefetch, preload] = [
                count("preconnect"),
                count("dns-prefetch"),
                count("preload")
            ];
            if (preload > 5)
                return warning(`Too many preloads: ${preload} (max 3-5)`);
            if (preconnect + dnsPrefetch + preload === 0)
                return info("No resource hints found. Consider adding some to improve resource loading");
            return success(`${preconnect} preconnect, ${preload} preload`);
        }
    },
    {
        id: "inlineStyles",
        run: ({ doc }) => {
            const count = doc.querySelectorAll("[style]").length;
            if (count > 50)
                return warning(`Excessive inline styles: ${count}`);
            return success(count === 0 ? "No inline styles" : `${count} inline styles`);
        }
    }
];
/** 13. Analytics and consent. */
export const trackingChecks = [
    {
        id: "analyticsDetection",
        run: ({ doc }) => {
            const has = (selector) => doc.querySelector(selector) !== null;
            const detected = [];
            if (has('script[src*="googletagmanager.com/gtag"]'))
                detected.push("GA4");
            else if (has('script[src*="analytics.js"], script[src*="gtag/js"]'))
                detected.push("GA");
            if (has('meta[name="google-site-verification"]'))
                detected.push("Search Console");
            if (has('script[src*="fbevents.js"]'))
                detected.push("Facebook Pixel");
            if (has('script[src*="matomo"], script[src*="piwik"]'))
                detected.push("Matomo");
            return info(detected.length === 0 ? "No analytics detected" : detected.join(", "));
        }
    },
    {
        id: "cookieConsent",
        run: (ctx) => {
            const found = ctx
                .scripts()
                .some((s) => COOKIE_TOOLS.some((tool) => s.src.toLowerCase().includes(tool)));
            return info(found ? "Cookie consent detected !" : "No cookie consent (GDPR compliance)");
        }
    }
];
/** 14. Security (headers: not verifiable from the DOM). */
export const securityChecks = [
    { id: "csp", run: () => info("Configure a Content-Security-Policy header or meta tag") },
    { id: "referrerPolicy", run: () => info("Configure the Referrer-Policy header") }
];
/** 15. Accessibility. */
export const accessibilityChecks = [
    {
        id: "formLabels",
        run: ({ doc }) => {
            const fields = [
                ...doc.querySelectorAll('input:not([type="hidden"]), textarea, select')
            ];
            if (fields.length === 0)
                return success("No forms");
            const unlabeled = fields.filter((field) => {
                const hasLabel = field.id && doc.querySelector(`label[for="${escapeId(field.id)}"]`);
                const hasAria = field.hasAttribute("aria-label") || field.hasAttribute("aria-labelledby");
                return !hasLabel && !hasAria;
            });
            return unlabeled.length > 0
                ? warning(`${unlabeled.length}/${fields.length} fields without labels`)
                : success(`${fields.length} labeled fields`);
        }
    },
    {
        id: "ariaLandmarks",
        run: ({ doc }) => {
            const total = doc.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]').length + doc.querySelectorAll("main, nav, header, footer").length;
            return total === 0
                ? warning("No ARIA/semantic landmarks")
                : success(`${total} landmarks`);
        }
    }
];
/** 16. Mobile. */
export const mobileChecks = [
    {
        id: "touchTargetSize",
        run: ({ doc }) => {
            const targets = [
                ...doc.querySelectorAll('a, button, input, select, textarea, [role="button"]')
            ];
            if (targets.length === 0)
                return success("No interactive elements");
            const tooSmall = targets.filter((el) => {
                const { width, height } = el.getBoundingClientRect();
                return ((width > 0 && width < MIN_TOUCH_TARGET) ||
                    (height > 0 && height < MIN_TOUCH_TARGET));
            });
            return tooSmall.length > targets.length * 0.3
                ? warning(`${tooSmall.length}/${targets.length} targets < ${MIN_TOUCH_TARGET}px`)
                : success(`Touch targets ≥${MIN_TOUCH_TARGET}px`);
        }
    },
    onContent("fontSizeReadability", (content, ctx) => {
        const paragraphs = [...content.querySelectorAll("p")];
        if (paragraphs.length === 0)
            return success("No paragraphs");
        const view = ctx.win;
        const small = paragraphs.filter((p) => (view ? Number.parseFloat(view.getComputedStyle(p).fontSize) : MIN_FONT_PX) <
            MIN_FONT_PX);
        return small.length > paragraphs.length * 0.5
            ? warning(`${small.length}/${paragraphs.length} paragraphs < ${MIN_FONT_PX}px`)
            : success(`Font size ≥${MIN_FONT_PX}px`);
    })
];
//# sourceMappingURL=technical.js.map