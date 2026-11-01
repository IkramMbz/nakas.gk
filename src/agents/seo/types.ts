import type { CheckStatus } from "../../ui/checker/types.js";

export type SeoStatus = CheckStatus;

export interface SeoCheckResult {
    status: SeoStatus;
    message: string;
}

export interface SeoAuditResult {
    checks: Record<string, SeoCheckResult>;
    /** Number of passed checks. */
    score: number;
    /** Number of scored checks (`info` excluded). */
    total: number;
}

export interface SeoAuditOptions {
    /** Content area selector (see `NakasOptions.contentSelector`). */
    contentSelector?: string | undefined;
}
