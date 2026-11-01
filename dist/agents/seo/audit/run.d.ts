import type { SeoAuditOptions, SeoAuditResult } from "../types.js";
/**
 * Audits a document. Pure: the `Document` is a parameter (browser, jsdom, iframe…).
 * A check that throws is reported as an error without stopping the others.
 */
export declare function runSeoAudit(doc: Document, options?: SeoAuditOptions): SeoAuditResult;
//# sourceMappingURL=run.d.ts.map