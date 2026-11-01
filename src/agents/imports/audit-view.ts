import type { CheckItem, CheckStatus } from "../../ui/checker/types.js";
import { getHint } from "./hints.js";
import type { ImportAuditResult, ImportFinding } from "./types.js";

export interface ImportSummary {
    errors: number;
    warnings: number;
    tone: CheckStatus;
    headline: string;
}

export function summarize(result: ImportAuditResult): ImportSummary {
    const errors = result.findings.filter((f) => f.severity === "error").length;
    const warnings = result.findings.length - errors;
    return {
        errors,
        warnings,
        tone: errors > 0 ? "error" : warnings > 0 ? "warning" : "success",
        headline:
            errors + warnings === 0
                ? "Aucun problème d'import"
                : `${errors} erreur(s), ${warnings} avertissement(s)`
    };
}

/** Groups findings by file (alphabetical), then by line. */
export function toCheckItems(findings: readonly ImportFinding[]): CheckItem[] {
    const byFile = new Map<string, ImportFinding[]>();
    for (const f of findings) {
        const list = byFile.get(f.file);
        if (list) list.push(f);
        else byFile.set(f.file, [f]);
    }
    return [...byFile]
        .toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([file, list]) => ({
            id: file,
            status: list.some((f) => f.severity === "error") ? "error" : "warning",
            title: `${file} (${list.length})`,
            details: list
                .toSorted((a, b) => a.line - b.line)
                .map((f) => {
                    const hint = getHint(f);
                    return {
                        id: `${f.rule}-${f.line}-${f.message}`,
                        label: `L${f.line}`,
                        message: f.message,
                        ...(f.evidence ? { evidence: f.evidence } : {}),
                        ...(hint ? { hint } : {})
                    };
                })
        }));
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Type guard for the server response (the network boundary is never trusted). */
export function isImportAudit(v: unknown): v is ImportAuditResult {
    return (
        isRecord(v) &&
        Array.isArray(v["findings"]) &&
        typeof v["filesScanned"] === "number" &&
        typeof v["truncated"] === "boolean" &&
        typeof v["dir"] === "string"
    );
}
