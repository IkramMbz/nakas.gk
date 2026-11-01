import path from "node:path";
import { fileURLToPath } from "node:url";
import { DevkitError } from "./errors.mjs";
import { loadAgent } from "./agent.mjs";
import {
    resolveWorkspace,
    collectWorkspace,
    fingerprintWorkspace,
    normalizeInclude,
    isPartialScope
} from "./paths.mjs";
import { runSandboxed } from "./sandbox.mjs";
import { validateFindings, cleanText } from "./sanitize.mjs";
import { LIMITS, SKIP_DIRS } from "./policy.mjs";

export const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Single API for the CLI, tests and (later) a Cursor/VS Code adapter.
// Input: agent name + workspace path. Output: `devkit.result/1` object.
export async function runAgent({
    name,
    workspace,
    root = DEFAULT_ROOT,
    strict = false,
    timeoutMs,
    include
} = {}) {
    const t0 = Date.now();
    const agent = await loadAgent(root, name, { requireLock: true });
    const wsRoot = await resolveWorkspace(workspace);
    const scope = normalizeInclude(include);

    let files = [];
    let stats = { files: 0, bytes: 0, truncated: false, skipped: {} };
    if (agent.permissions.read === "workspace")
        ({ files, stats } = await collectWorkspace(wsRoot, { include: scope }));

    // The agent gets no absolute path, env or fs access: only this snapshot.
    const input = {
        schema: "devkit.input/1",
        files,
        // Restricted scope: out-of-scope imports cannot be verified (lower confidence).
        truncated: stats.truncated || isPartialScope(scope),
        skipDirNames: [...SKIP_DIRS]
    };
    const { findings: raw, isolation } = await runSandboxed({
        entries: agent.entries,
        scriptRel: agent.script,
        input,
        strict,
        timeoutMs: timeoutMs ?? LIMITS.timeoutMs
    });
    const checked = validateFindings(raw, new Set(files.map((f) => f.path)));
    if (!checked) throw new DevkitError("E_OUTPUT", '"findings" doit être un tableau');

    return {
        schema: "devkit.result/1",
        agent: {
            name: agent.name,
            sha256: agent.sha256,
            description: cleanText(agent.description, 300),
            permissions: agent.permissions
        },
        workspace: {
            files: stats.files,
            bytes: stats.bytes,
            truncated: stats.truncated,
            partial: isPartialScope(scope),
            skipped: stats.skipped
        },
        isolation,
        findings: checked.findings,
        rejected: checked.rejected,
        durationMs: Date.now() - t0
    };
}

/**
 * Cheap workspace fingerprint (no content read, no agent run).
 * Same validation and file policy as `runAgent`.
 */
export async function workspaceFingerprint({ workspace, include } = {}) {
    const wsRoot = await resolveWorkspace(workspace);
    return fingerprintWorkspace(wsRoot, { include });
}
