// Path guard. The PARENT (runner) is the only reader of the workspace:
// the agent gets an in-memory snapshot and has no fs access to the project.
import fs from "node:fs/promises";
import { constants as C } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { DevkitError } from "./errors.mjs";
import { LIMITS, CODE_EXT, SKIP_DIRS, SKIP_FILES, SENSITIVE_DIRS } from "./policy.mjs";

const NAME_RE = /^[a-z][a-z0-9-]{1,39}$/;
export function assertAgentName(name) {
    if (typeof name !== "string" || !NAME_RE.test(name)) {
        throw new DevkitError(
            "E_USAGE",
            "nom d'agent invalide (a-z, 0-9, tirets, 2 à 40 caractères)"
        );
    }
    return name;
}

const SENSITIVE_FILE = [
    /^\.env(\..*)?$/i,
    /^\.envrc$/i,
    /\.(pem|key|p12|pfx|jks|keystore|kdbx|ppk)$/i,
    /^id_(rsa|dsa|ecdsa|ed25519)/i,
    /^\.(npmrc|netrc|pypirc|git-credentials|htpasswd|dockercfg)$/i,
    /^(credentials?|secrets?)(\..*)?$/i,
    /service[-_]?account.*\.json$/i,
    /\.tfstate(\..*)?$/i,
    /^\.?tokens?(\..*)?$/i
];
export const isSensitiveName = (name) => SENSITIVE_FILE.some((re) => re.test(name));

const FORBIDDEN_ROOTS = [
    "/etc",
    "/proc",
    "/sys",
    "/dev",
    "/boot",
    "/root",
    "/usr",
    "/bin",
    "/sbin",
    "/lib"
];

export async function resolveWorkspace(input) {
    if (
        typeof input !== "string" ||
        input.length === 0 ||
        input.length > 4096 ||
        input.includes("\0")
    ) {
        throw new DevkitError("E_USAGE", "chemin de workspace invalide");
    }
    let real;
    try {
        real = await fs.realpath(path.resolve(input));
    } catch {
        throw new DevkitError("E_USAGE", "workspace introuvable");
    }
    const st = await fs.stat(real);
    if (!st.isDirectory()) throw new DevkitError("E_USAGE", "le workspace doit être un dossier");

    let home = os.homedir();
    try {
        home = await fs.realpath(home);
    } catch {
        /* keeps the raw value */
    }
    if (real === path.parse(real).root)
        throw new DevkitError("E_POLICY", "workspace refusé : racine du disque");
    if (real === home)
        throw new DevkitError(
            "E_POLICY",
            "workspace refusé : dossier personnel entier (choisis un projet)"
        );
    if (real.split(path.sep).some((s) => SENSITIVE_DIRS.has(s))) {
        throw new DevkitError("E_POLICY", "workspace refusé : dossier de secrets");
    }
    if (
        process.platform !== "win32" &&
        FORBIDDEN_ROOTS.some((r) => real === r || real.startsWith(r + "/"))
    ) {
        throw new DevkitError("E_POLICY", "workspace refusé : dossier système");
    }
    return real;
}

const O_FLAGS = C.O_RDONLY | (C.O_NOFOLLOW ?? 0) | (C.O_NONBLOCK ?? 0);
const within = (root, p) => p === root || p.startsWith(root + path.sep);
// eslint-disable-next-line no-control-regex
const WEIRD_NAME = /[\u0000-\u001f\u007f]/;

async function readCapped(abs, root, stats) {
    let fh;
    try {
        fh = await fs.open(abs, O_FLAGS); // O_NOFOLLOW: a link created after readdir fails here
        const st = await fh.stat();
        if (!st.isFile()) {
            stats.skipped.special++;
            return null;
        }
        if (st.size > LIMITS.maxFileBytes) {
            stats.skipped.tooLarge++;
            return null;
        }
        const real = await fs.realpath(abs); // parent folders were not swapped for a link
        if (!within(root, real)) {
            stats.skipped.symlinks++;
            return null;
        }
        const buf = Buffer.allocUnsafe(Math.min(st.size, LIMITS.maxFileBytes) + 1);
        let off = 0;
        while (off < buf.length) {
            const { bytesRead } = await fh.read(buf, off, buf.length - off, off);
            if (bytesRead === 0) break;
            off += bytesRead;
        }
        if (off > LIMITS.maxFileBytes) {
            stats.skipped.tooLarge++;
            return null;
        } // grew during the read
        const data = buf.subarray(0, off);
        if (data.includes(0)) {
            stats.skipped.binary++;
            return null;
        }
        return data;
    } catch {
        stats.skipped.unreadable++;
        return null;
    } finally {
        await fh?.close().catch(() => {});
    }
}

const newStats = () => ({
    files: 0,
    bytes: 0,
    truncated: false,
    skipped: {
        symlinks: 0,
        sensitive: 0,
        tooLarge: 0,
        binary: 0,
        special: 0,
        unreadable: 0,
        dirs: 0
    }
});

const byCode = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// Config files read at the root even when the scope is restricted
// (without them, declared dependencies cannot be verified).
export const ROOT_CONFIG_FILES = Object.freeze(["package.json", "tsconfig.json", "jsconfig.json"]);

/**
 * Validates an `include` scope (list of workspace-relative folders).
 * Returns normalized POSIX paths; `["."]` (or absent) = whole workspace.
 */
export function normalizeInclude(include) {
    if (include === undefined) return ["."];
    if (!Array.isArray(include) || include.length === 0 || include.length > 32) {
        throw new DevkitError("E_USAGE", "include : liste de 1 à 32 dossiers attendue");
    }
    const out = new Set();
    for (const raw of include) {
        if (typeof raw !== "string" || raw.length === 0 || raw.length > 512 || raw.includes("\0")) {
            throw new DevkitError("E_USAGE", "include : chemin invalide");
        }
        const posix = raw.replaceAll("\\", "/");
        if (posix.startsWith("/") || /^[A-Za-z]:/.test(posix)) {
            throw new DevkitError(
                "E_USAGE",
                `include : chemin absolu refusé (${JSON.stringify(raw)})`
            );
        }
        const segs = posix.split("/").filter((seg) => seg !== "" && seg !== ".");
        if (segs.includes("..")) {
            throw new DevkitError("E_USAGE", `include : « .. » refusé (${JSON.stringify(raw)})`);
        }
        out.add(segs.length === 0 ? "." : segs.join("/"));
    }
    return out.has(".") ? ["."] : [...out].toSorted(byCode);
}

/** True when the scope does not cover the whole workspace (external imports unverifiable). */
export const isPartialScope = (include) => !include.includes(".");

async function resolveScopeDirs(root, include) {
    const dirs = [];
    for (const rel of include) {
        const abs = rel === "." ? root : path.join(root, ...rel.split("/"));
        let st;
        try {
            st = await fs.lstat(abs);
        } catch {
            throw new DevkitError("E_USAGE", `include : dossier introuvable (${rel})`);
        }
        if (st.isSymbolicLink() || !st.isDirectory()) {
            throw new DevkitError("E_POLICY", `include : doit être un vrai dossier (${rel})`);
        }
        if (!within(root, await fs.realpath(abs))) {
            throw new DevkitError("E_POLICY", `include : hors du workspace (${rel})`);
        }
        dirs.push({ abs, rel: rel === "." ? "" : rel });
    }
    return dirs;
}

/**
 * Lists, without reading files, those the agent could receive: same policy
 * (ignored dirs, secrets, symlinks, extensions) for the snapshot and the fingerprint.
 */
async function listCandidates(root, include, stats) {
    const candidates = [];
    const stack = [];
    for (const { abs, rel } of (await resolveScopeDirs(root, include)).toReversed()) {
        stack.push({ abs, rel, depth: 0 });
    }

    walk: while (stack.length) {
        const { abs, rel, depth } = stack.pop();
        let entries;
        try {
            entries = await fs.readdir(abs, { withFileTypes: true });
        } catch {
            stats.skipped.unreadable++;
            continue;
        }
        if (entries.length > LIMITS.maxDirEntries) {
            entries.length = LIMITS.maxDirEntries;
            stats.truncated = true;
        }
        entries.sort((a, b) => byCode(a.name, b.name));

        // LIFO stack: push folders in reverse to visit them alphabetically.
        const subdirs = [];
        for (const e of entries) {
            if (WEIRD_NAME.test(e.name)) {
                stats.skipped.sensitive++;
                continue;
            }
            const childAbs = path.join(abs, e.name);
            const childRel = rel ? `${rel}/${e.name}` : e.name;
            if (e.isSymbolicLink()) {
                stats.skipped.symlinks++;
                continue;
            }
            if (e.isDirectory()) {
                if (SKIP_DIRS.has(e.name) || SENSITIVE_DIRS.has(e.name)) {
                    stats.skipped.dirs++;
                    continue;
                }
                if (depth + 1 > LIMITS.maxDepth) {
                    stats.truncated = true;
                    continue;
                }
                subdirs.push({ abs: childAbs, rel: childRel, depth: depth + 1 });
                continue;
            }
            if (!e.isFile()) {
                stats.skipped.special++;
                continue;
            }
            if (isSensitiveName(e.name)) {
                stats.skipped.sensitive++;
                continue;
            }
            const ext = path.extname(e.name).toLowerCase();
            if (!CODE_EXT.has(ext) || SKIP_FILES.has(e.name)) continue;
            if (candidates.length >= LIMITS.maxFiles) {
                stats.truncated = true;
                break walk;
            }
            candidates.push({ abs: childAbs, rel: childRel });
        }
        for (const d of subdirs.toReversed()) stack.push(d);
    }

    // Root config files when the scope is restricted.
    if (isPartialScope(include)) {
        for (const name of ROOT_CONFIG_FILES) {
            const abs = path.join(root, name);
            const st = await fs.lstat(abs).catch(() => null);
            if (st?.isFile() && !candidates.some((c) => c.rel === name)) {
                candidates.push({ abs, rel: name });
            }
        }
    }
    return candidates.toSorted((a, b) => byCode(a.rel, b.rel));
}

/**
 * Bounded, deterministic snapshot: no symlinks, no secrets.
 * `include` restricts reading to some folders (workspace-relative).
 */
export async function collectWorkspace(root, { include } = {}) {
    const scope = normalizeInclude(include);
    const stats = newStats();
    const files = [];
    for (const { abs, rel } of await listCandidates(root, scope, stats)) {
        if (files.length >= LIMITS.maxFiles || stats.bytes >= LIMITS.maxTotalBytes) {
            stats.truncated = true;
            break;
        }
        const data = await readCapped(abs, root, stats);
        if (!data) continue;
        if (stats.bytes + data.length > LIMITS.maxTotalBytes) {
            stats.truncated = true;
            break;
        }
        stats.bytes += data.length;
        let text = data.toString("utf8");
        if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
        files.push({ path: rel, text });
    }
    stats.files = files.length;
    return { files, stats };
}

/**
 * Cheap fingerprint (no content read) of what `collectWorkspace` would read:
 * path + size + mtime. Used to rerun the agent only when the project changed.
 */
export async function fingerprintWorkspace(root, { include } = {}) {
    const scope = normalizeInclude(include);
    const stats = newStats();
    const hash = createHash("sha256");
    for (const { abs, rel } of await listCandidates(root, scope, stats)) {
        const st = await fs.lstat(abs).catch(() => null);
        if (st?.isFile()) hash.update(`${rel}\0${st.size}\0${Math.trunc(st.mtimeMs)}\n`);
    }
    return hash.digest("hex");
}
