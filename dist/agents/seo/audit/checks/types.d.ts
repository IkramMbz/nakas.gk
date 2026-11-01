import type { SeoCheckResult } from "../../types.js";
import type { SeoContext } from "../context.js";
/** An audit check: stable id (result key) + pure function of the context. */
export interface SeoCheck {
    id: string;
    run: (ctx: SeoContext) => SeoCheckResult;
}
/** Check on the content area: fails cleanly if it is missing. */
export declare function onContent(id: string, run: (content: HTMLElement, ctx: SeoContext) => SeoCheckResult): SeoCheck;
/** External link = valid URL whose host differs from the page host. */
export declare function isExternal(a: HTMLAnchorElement, ctx: SeoContext): boolean;
export declare function isInternal(a: HTMLAnchorElement, ctx: SeoContext): boolean;
//# sourceMappingURL=types.d.ts.map