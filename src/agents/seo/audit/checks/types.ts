import type { SeoCheckResult } from "../../types.js";
import type { SeoContext } from "../context.js";

/** An audit check: stable id (result key) + pure function of the context. */
export interface SeoCheck {
    id: string;
    run: (ctx: SeoContext) => SeoCheckResult;
}

/** Check on the content area: fails cleanly if it is missing. */
export function onContent(
    id: string,
    run: (content: HTMLElement, ctx: SeoContext) => SeoCheckResult
): SeoCheck {
    return {
        id,
        run: (ctx) => {
            const { element, problem } = ctx.mainContent();
            return element
                ? run(element, ctx)
                : { status: "error", message: problem ?? "Content area not found" };
        }
    };
}

/** External link = valid URL whose host differs from the page host. */
export function isExternal(a: HTMLAnchorElement, ctx: SeoContext): boolean {
    try {
        return new URL(a.href, ctx.loc.href).hostname !== ctx.hostname;
    } catch {
        return false;
    }
}

export function isInternal(a: HTMLAnchorElement, ctx: SeoContext): boolean {
    try {
        return new URL(a.href, ctx.loc.href).hostname === ctx.hostname;
    } catch {
        return false;
    }
}
