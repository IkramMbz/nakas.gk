import { useEffect, useState } from "react";
import { runSeoAudit } from "./audit/run.js";
const DEBOUNCE_MS = 400;
/** Attributes whose change can alter a result (excludes noisy `style`/`class`). */
const WATCHED_ATTRIBUTES = [
    "content",
    "href",
    "src",
    "alt",
    "lang",
    "rel",
    "name",
    "property",
    "hreflang",
    "type",
    "id",
    "role",
    "aria-label",
    "aria-labelledby",
    "for",
    "loading",
    "width",
    "height",
    "target",
    "media",
    "async",
    "defer",
    "charset"
];
/**
 * Live SEO audit: rerun (debounced) on every document change or resize,
 * and only while the panel is visible.
 */
export function useSeoAudit(enabled, options) {
    const [audit, setAudit] = useState(null);
    const { contentSelector } = options;
    useEffect(() => {
        if (!enabled)
            return undefined;
        const run = () => setAudit(runSeoAudit(document, { contentSelector }));
        let timer;
        const schedule = () => {
            clearTimeout(timer);
            timer = setTimeout(run, DEBOUNCE_MS);
        };
        run();
        const observer = new MutationObserver(schedule);
        observer.observe(document.documentElement, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
            attributeFilter: WATCHED_ATTRIBUTES
        });
        window.addEventListener("resize", schedule);
        window.addEventListener("load", schedule);
        return () => {
            clearTimeout(timer);
            observer.disconnect();
            window.removeEventListener("resize", schedule);
            window.removeEventListener("load", schedule);
        };
    }, [enabled, contentSelector]);
    return audit;
}
//# sourceMappingURL=use-seo-audit.js.map