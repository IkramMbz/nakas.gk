import type { CheckItem, CheckStatus } from "../../ui/checker/types.js";
import type { SeoAuditResult } from "./types.js";
/** `ogTitle` → `Og Title` */
export declare const formatLabel: (text: string) => string;
export declare function toCheckItems(audit: SeoAuditResult): CheckItem[];
export declare function complianceOf(audit: SeoAuditResult): {
    percentage: number;
    tone: CheckStatus;
};
//# sourceMappingURL=audit-view.d.ts.map