/** Vocabulary shared by all diagnostic panels (SEO, imports, …). */
export type CheckStatus = "success" | "warning" | "error" | "info";
export declare const STATUS_LABEL: Readonly<Record<CheckStatus, string>>;
export interface CheckDetail {
    id: string;
    /** Short marker shown in bold (e.g. `L12`). */
    label?: string;
    message: string;
    /** Code excerpt or value behind the finding. */
    evidence?: string;
    /** Fix hint. */
    hint?: string;
}
export interface CheckItem {
    id: string;
    status: CheckStatus;
    title: string;
    details: readonly CheckDetail[];
}
//# sourceMappingURL=types.d.ts.map