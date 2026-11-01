/* eslint-disable no-control-regex */
import { LIMITS } from "./policy.mjs";

// Strips ANSI/OSC sequences, C0/C1 controls, bidi overrides (Trojan Source) and zero-width
// characters so a finding can't inject anything into a terminal or IDE.
const ANSI = /\u001b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)?|[@-Z\\-_])/g;
const BAD =
    /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g;

export function cleanText(value, max) {
    if (typeof value !== "string") return "";
    let s = value.slice(0, max * 4); // bound regex work
    s = s
        .replace(ANSI, "")
        .replace(/[\r\n\t]+/g, " ")
        .replace(BAD, "");
    if (s.length > max) s = s.slice(0, max - 1) + "…";
    return s;
}

const SEVERITIES = new Set(["error", "warning", "info"]);
const CONFIDENCES = new Set(["high", "medium", "low"]);
const KEYS = new Set(["rule", "severity", "file", "line", "evidence", "message", "confidence"]);
const RULE_RE = /^[a-z][a-z0-9-]{0,39}$/;
const ORDER = { error: 0, warning: 1, info: 2 };

// A finding may only target a file that was actually given to the agent.
function isValid(f, knownFiles) {
    return (
        f !== null &&
        typeof f === "object" &&
        !Array.isArray(f) &&
        Object.keys(f).every((k) => KEYS.has(k)) &&
        SEVERITIES.has(f.severity) &&
        CONFIDENCES.has(f.confidence) &&
        typeof f.rule === "string" &&
        RULE_RE.test(f.rule) &&
        typeof f.file === "string" &&
        knownFiles.has(f.file) &&
        Number.isInteger(f.line) &&
        f.line >= 1 &&
        f.line <= 10_000_000
    );
}

// Rebuilds every finding field by field: nothing the agent returns is passed through as is.
export function validateFindings(raw, knownFiles) {
    if (!Array.isArray(raw)) return null;
    const out = [];
    const total = Math.min(raw.length, LIMITS.maxFindings);
    let rejected = raw.length - total;
    for (let i = 0; i < total; i++) {
        const f = raw[i];
        if (!isValid(f, knownFiles)) {
            rejected++;
            continue;
        }
        out.push({
            rule: f.rule,
            severity: f.severity,
            file: cleanText(f.file, 500),
            line: f.line,
            evidence: cleanText(f.evidence, LIMITS.maxEvidence),
            message: cleanText(f.message, LIMITS.maxMessage),
            confidence: f.confidence
        });
    }
    out.sort(
        (a, b) =>
            ORDER[a.severity] - ORDER[b.severity] ||
            (a.file < b.file ? -1 : a.file > b.file ? 1 : 0) ||
            a.line - b.line
    );
    return { findings: out, rejected };
}
