/** JSON contract between the `imports` server tool and its panel (pure types, no runtime). */
export type ImportSeverity = "error" | "warning" | "info";

export interface ImportFinding {
    rule: string;
    severity: ImportSeverity;
    file: string;
    line: number;
    evidence: string;
    message: string;
    confidence: "high" | "medium" | "low";
}

export interface ImportAuditResult {
    findings: ImportFinding[];
    filesScanned: number;
    /** A limit was hit or scope is partial: some imports could not be verified. */
    truncated: boolean;
    /** Analyzed folders, for display. */
    dir: string;
    /** Network isolation achieved by the sandbox (`best-effort` = no network namespace). */
    isolation: "netns" | "best-effort";
    /** Invalid findings rejected by the runner. */
    rejected: number;
    durationMs: number;
    /** Result served from cache (project unchanged). */
    cached: boolean;
}
