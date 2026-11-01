import type { CheckItem, CheckStatus } from "../../ui/checker/types.js";
import type { ImportAuditResult, ImportFinding } from "./types.js";
export interface ImportSummary {
    errors: number;
    warnings: number;
    tone: CheckStatus;
    headline: string;
}
export declare function summarize(result: ImportAuditResult): ImportSummary;
/** Groups findings by file (alphabetical), then by line. */
export declare function toCheckItems(findings: readonly ImportFinding[]): CheckItem[];
/** Type guard for the server response (the network boundary is never trusted). */
export declare function isImportAudit(v: unknown): v is ImportAuditResult;
//# sourceMappingURL=audit-view.d.ts.map