import { stat } from "node:fs/promises";
import path from "node:path";

import { runAgent, workspaceFingerprint } from "../../devkit/core/index.mjs";
import type { ServerTool, ToolContext } from "../../server/types.js";
import type { ImportAuditResult, ImportFinding } from "./types.js";

/** Folder name of the locked agent in `devkit/agents/`. */
export const IMPORT_AGENT = "import-doctor";

const DEFAULT_DIR = "src";

interface CacheEntry {
    fingerprint: string;
    result: ImportAuditResult;
}
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<ImportAuditResult>>();

async function resolveDirs(root: string, requested: readonly string[] | undefined) {
    if (requested && requested.length > 0) return [...requested];
    const hasSrc = await stat(path.join(root, DEFAULT_DIR)).then(
        (s) => s.isDirectory(),
        () => false
    );
    return hasSrc ? [DEFAULT_DIR] : ["."];
}

async function scan(
    { root, options }: ToolContext,
    dirs: string[],
    fingerprint: string
): Promise<ImportAuditResult> {
    // Always via the runner: agents.lock check + `--permission` sandbox + sanitization.
    const res = await runAgent({
        name: IMPORT_AGENT,
        workspace: root,
        include: dirs,
        strict: options.strict === true
    });
    const result: ImportAuditResult = {
        findings: res.findings satisfies ImportFinding[],
        filesScanned: res.workspace.files,
        truncated: res.workspace.truncated || res.workspace.partial,
        dir: dirs.join(", "),
        isolation: res.isolation.network,
        rejected: res.rejected,
        durationMs: res.durationMs,
        cached: false
    };
    cache.set(`${root}\0${dirs.join(",")}`, { fingerprint, result });
    return result;
}

/** `imports` tool: import analysis, rerun only when the project changed. */
export const importsTool: ServerTool = async (context) => {
    const dirs = await resolveDirs(context.root, context.options.imports?.dirs);
    const key = `${context.root}\0${dirs.join(",")}`;
    const fingerprint = await workspaceFingerprint({ workspace: context.root, include: dirs });

    const hit = cache.get(key);
    if (!context.force && hit?.fingerprint === fingerprint) {
        return { ...hit.result, cached: true } satisfies ImportAuditResult;
    }
    const pending = inflight.get(key);
    if (pending) return pending;

    const run = scan(context, dirs, fingerprint).finally(() => inflight.delete(key));
    inflight.set(key, run);
    return run;
};

/** Clears the cache (tests). */
export function clearImportsCache(): void {
    cache.clear();
    inflight.clear();
}
