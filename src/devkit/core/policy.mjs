// All limits and ceilings in one place. Nothing here is read from
// the environment, a SKILL.md or the workspace: these values are not negotiable.

export const LIMITS = Object.freeze({
    // agent run
    timeoutMs: 30_000,
    memoryMb: 384,
    maxOutputBytes: 1 << 20, // agent JSON result
    maxFindings: 1000,
    maxEvidence: 300,
    maxMessage: 600,
    // workspace snapshot (read by the PARENT, never by the agent)
    maxFiles: 4000,
    maxFileBytes: 1 << 20,
    maxTotalBytes: 16 << 20,
    maxDepth: 25,
    maxDirEntries: 20_000,
    // agent folder
    agentMaxFiles: 50,
    agentMaxFileBytes: 256 << 10,
    agentMaxTotalBytes: 2 << 20,
    agentMaxDepth: 3
});

export const CODE_EXT = new Set([
    ".js",
    ".mjs",
    ".cjs",
    ".jsx",
    ".ts",
    ".mts",
    ".cts",
    ".tsx",
    ".json"
]);
export const AGENT_EXT = new Set([".md", ".mjs", ".json", ".txt"]);

export const SKIP_DIRS = new Set([
    "node_modules",
    ".git",
    ".hg",
    ".svn",
    "dist",
    "build",
    "out",
    "coverage",
    ".next",
    ".nuxt",
    ".turbo",
    ".cache",
    ".parcel-cache",
    ".venv",
    "venv",
    "__pycache__",
    "target",
    ".gradle",
    ".idea",
    "bower_components"
]);

// Folders that must never be read, even if pointed at directly.
export const SENSITIVE_DIRS = new Set([
    ".ssh",
    ".aws",
    ".gnupg",
    ".kube",
    ".docker",
    ".azure",
    ".config"
]);

export const SKIP_FILES = new Set(["package-lock.json", "npm-shrinkwrap.json"]);

// Permission ceiling a SKILL.md may DECLARE. Declaring more = agent rejected.
// The runner never grants more than this ceiling, whatever the SKILL.md says.
export const PERMISSION_CEILING = Object.freeze({
    read: ["workspace", "none"],
    write: ["none"],
    network: ["none"],
    exec: ["none"]
});

// Node modules an agent may import (no network/process/fs access).
export const AGENT_ALLOWED_BUILTINS = new Set([
    "path",
    "url",
    "util",
    "assert",
    "buffer",
    "string_decoder",
    "crypto",
    "events"
]);

export const MIN_NODE = [22, 13, 0]; // stable --permission from this version

/** True if `version` (e.g. "22.13.0") is at least `MIN_NODE`. Equality allowed. */
export function isNodeSupported(version = process.versions.node) {
    const cur = version.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
        const have = cur[i] ?? 0;
        const need = MIN_NODE[i] ?? 0;
        if (have !== need) return have > need;
    }
    return true;
}
