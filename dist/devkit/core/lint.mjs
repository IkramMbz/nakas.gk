// Static tripwire, NOT a security boundary. It catches agents that
// clearly signal hostile or careless intent, to reject early
// with a useful message. The real boundary is sandbox.mjs (--permission,
// no workspace access, empty env, netns, limits) — see SECURITY.md.
import { DevkitError } from "./errors.mjs";
import { AGENT_ALLOWED_BUILTINS } from "./policy.mjs";

const SPEC_PATTERNS = [
    /(?<!['"`.])\bfrom\s*(['"`])([^'"`\n]*)\1/g,
    /(?<!['"`.])\bimport\s*\(?\s*(['"`])([^'"`\n]*)\1/g,
    /(?<!['"`.])\brequire\s*\(\s*(['"`])([^'"`\n]*)\1/g
];
const BANNED = [
    [/\bimport\s*\(\s*(?!['"`])/, "import() dynamique non littéral"],
    [/\beval\s*\(/, "eval"],
    [/\bnew\s+Function\b|\bFunction\s*\(/, "Function()"],
    [
        /\bprocess\s*\.\s*(binding|dlopen|_linkedBinding|mainModule|reallyExit|kill|abort|chdir|exit)\b/,
        "API process dangereuse"
    ],
    [/\b(?:globalThis|global|window|self)\s*\[/, "accès dynamique au global"],
    [/\.constructor\s*\.\s*constructor/, "échappatoire par constructor"],
    [
        /\b(?:fetch|WebSocket|EventSource|XMLHttpRequest|WebAssembly|SharedArrayBuffer)\b/,
        "API réseau/binaire"
    ],
    [/\bimport\s*\.\s*meta\s*\.\s*(?:resolve|dirname|filename)\b/, "import.meta.*"],
    [/\bcreateRequire\b|\bmodule\s*\.\s*register\b/, "chargeur de modules"]
];

export function lintAgent(entries) {
    const problems = [];
    for (const { rel, buf } of entries) {
        if (!rel.endsWith(".mjs")) continue;
        const src = buf.toString("utf8");
        for (const re of SPEC_PATTERNS) {
            re.lastIndex = 0;
            for (const m of src.matchAll(re)) {
                const spec = m[2];
                if (spec.startsWith("./")) continue; // agent-relative; fs outside the agent is denied anyway
                const bare = spec.startsWith("node:") ? spec.slice(5) : spec;
                if (!AGENT_ALLOWED_BUILTINS.has(bare))
                    problems.push(`${rel}: import interdit "${spec}"`);
            }
        }
        for (const [re, label] of BANNED) if (re.test(src)) problems.push(`${rel}: ${label}`);
    }
    if (problems.length) {
        throw new DevkitError(
            "E_POLICY",
            `agent refusé par le lint de sécurité :\n  - ${[...new Set(problems)].join("\n  - ")}`
        );
    }
}
