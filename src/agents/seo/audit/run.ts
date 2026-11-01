import type { SeoAuditOptions, SeoAuditResult, SeoCheckResult } from "../types.js";
import { SEO_CHECKS } from "./checks/index.js";
import { createSeoContext } from "./context.js";

/**
 * Audits a document. Pure: the `Document` is a parameter (browser, jsdom, iframe…).
 * A check that throws is reported as an error without stopping the others.
 */
export function runSeoAudit(doc: Document, options: SeoAuditOptions = {}): SeoAuditResult {
    const ctx = createSeoContext(doc, options);
    const checks: Record<string, SeoCheckResult> = {};

    for (const check of SEO_CHECKS) {
        try {
            checks[check.id] = check.run(ctx);
        } catch (e) {
            checks[check.id] = {
                status: "error",
                message: `Check failed: ${e instanceof Error ? e.message : String(e)}`
            };
        }
    }

    const results = Object.values(checks);
    return {
        checks,
        score: results.filter((r) => r.status === "success").length,
        total: results.filter((r) => r.status !== "info").length
    };
}
