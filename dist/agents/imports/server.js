import { stat } from "node:fs/promises";
import path from "node:path";
import { runAgent, workspaceFingerprint } from "../../devkit/core/index.mjs";
/** Folder name of the locked agent in `devkit/agents/`. */
export const IMPORT_AGENT = "import-doctor";
const DEFAULT_DIR = "src";
const cache = new Map();
const inflight = new Map();
async function resolveDirs(root, requested) {
    if (requested && requested.length > 0)
        return [...requested];
    const hasSrc = await stat(path.join(root, DEFAULT_DIR)).then((s) => s.isDirectory(), () => false);
    return hasSrc ? [DEFAULT_DIR] : ["."];
}
async function scan({ root, options }, dirs, fingerprint) {
    // Always via the runner: agents.lock check + `--permission` sandbox + sanitization.
    const res = await runAgent({
        name: IMPORT_AGENT,
        workspace: root,
        include: dirs,
        strict: options.strict === true
    });
    const result = {
        findings: res.findings,
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
export const importsTool = async (context) => {
    const dirs = await resolveDirs(context.root, context.options.imports?.dirs);
    const key = `${context.root}\0${dirs.join(",")}`;
    const fingerprint = await workspaceFingerprint({ workspace: context.root, include: dirs });
    const hit = cache.get(key);
    if (!context.force && hit?.fingerprint === fingerprint) {
        return { ...hit.result, cached: true };
    }
    const pending = inflight.get(key);
    if (pending)
        return pending;
    const run = scan(context, dirs, fingerprint).finally(() => inflight.delete(key));
    inflight.set(key, run);
    return run;
};
/** Clears the cache (tests). */
export function clearImportsCache() {
    cache.clear();
    inflight.clear();
}
//# sourceMappingURL=server.js.map