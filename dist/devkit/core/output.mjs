// Parent-side filesystem access for transform agents: confined directory resolution,
// listing, and EXCLUSIVE writing (never overwrites, never deletes anything it did not create).
import fs from "node:fs/promises";
import { constants as C } from "node:fs";
import path from "node:path";
import { DevkitError } from "./errors.mjs";
import { isSensitiveName, resolveWorkspace } from "./paths.mjs";

const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
// eslint-disable-next-line no-control-regex
const WEIRD_NAME = /[\u0000-\u001f\u007f]/;
const within = (root, p) => p === root || p.startsWith(root + path.sep);

/**
 * Resolves `rel` (e.g. "public") under the project root: relative, no "..", real folder,
 * no symlink, still inside the root once resolved. Returns the absolute real path.
 */
export async function resolveConfinedDir(root, rel) {
    const wsRoot = await resolveWorkspace(root);
    if (typeof rel !== "string" || rel.length === 0 || rel.length > 200 || rel.includes("\0")) {
        throw new DevkitError("E_USAGE", "dossier invalide");
    }
    const posix = rel.replaceAll("\\", "/");
    if (posix.startsWith("/") || /^[A-Za-z]:/.test(posix)) {
        throw new DevkitError("E_USAGE", "dossier : chemin absolu refusé");
    }
    const segments = posix.split("/").filter((s) => s !== "" && s !== ".");
    if (segments.length === 0 || segments.some((s) => s === ".." || !SEGMENT.test(s))) {
        throw new DevkitError("E_USAGE", "dossier : chemin invalide");
    }
    let current = wsRoot;
    for (const segment of segments) {
        current = path.join(current, segment);
        const st = await fs.lstat(current).catch(() => null);
        if (!st) throw new DevkitError("E_USAGE", `dossier introuvable (${segments.join("/")})`);
        if (st.isSymbolicLink() || !st.isDirectory()) {
            throw new DevkitError("E_POLICY", "dossier refusé : doit être un vrai dossier");
        }
    }
    const real = await fs.realpath(current);
    if (!within(wsRoot, real)) throw new DevkitError("E_POLICY", "dossier hors du projet");
    return real;
}

/** Files directly inside `dir` (no recursion, no symlink) whose extension is in `exts`. */
export async function listConfinedFiles(dir, { exts, max = 200 }) {
    const out = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of entries) {
        if (out.length >= max) break;
        if (!e.isFile()) continue; // symlinks and folders: ignored
        if (e.name.startsWith(".") || WEIRD_NAME.test(e.name) || isSensitiveName(e.name)) continue;
        if (!exts.includes(path.extname(e.name).toLowerCase())) continue;
        const st = await fs.lstat(path.join(dir, e.name)).catch(() => null);
        if (st?.isFile()) out.push({ name: e.name, bytes: st.size });
    }
    return out;
}

const FILE_FLAGS = C.O_WRONLY | C.O_CREAT | C.O_EXCL | (C.O_NOFOLLOW ?? 0);

/**
 * Creates `parentDir/folderName/` (it must NOT exist) and writes `files` into it
 * ({ name: "a.png" | "sub/a.png", data: Buffer }). On error, removes ONLY what this
 * call created, then throws.
 */
export async function writeArtifactsExclusive({ parentDir, folderName, files }) {
    if (typeof folderName !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(folderName)) {
        throw new DevkitError("E_USAGE", "nom de dossier de sortie invalide");
    }
    const parent = await fs.realpath(parentDir).catch(() => null);
    if (!parent) throw new DevkitError("E_USAGE", "dossier de sortie introuvable");

    const plan = files.map(({ name, data }) => {
        const parts = String(name).split("/");
        if (parts.length > 2 || parts.some((p) => !SEGMENT.test(p)) || !Buffer.isBuffer(data)) {
            throw new DevkitError("E_OUTPUT", "nom de fichier de sortie invalide");
        }
        return { parts, data };
    });

    const target = path.join(parent, folderName);
    const createdDirs = [];
    const createdFiles = [];
    try {
        try {
            await fs.mkdir(target); // not recursive: fails if it exists
        } catch (e) {
            if (e?.code === "EEXIST") {
                throw new DevkitError(
                    "E_USAGE",
                    "le dossier de sortie existe déjà : réessaie dans une seconde"
                );
            }
            throw e;
        }
        createdDirs.push(target);
        for (const sub of new Set(
            plan.filter((p) => p.parts.length === 2).map((p) => p.parts[0])
        )) {
            await fs.mkdir(path.join(target, sub));
            createdDirs.push(path.join(target, sub));
        }
        for (const { parts, data } of plan) {
            const abs = path.join(target, ...parts);
            const fh = await fs.open(abs, FILE_FLAGS, 0o644);
            createdFiles.push(abs);
            try {
                await fh.writeFile(data);
            } finally {
                await fh.close();
            }
        }
    } catch (e) {
        for (const f of createdFiles) await fs.unlink(f).catch(() => {});
        for (const d of createdDirs.toReversed()) await fs.rmdir(d).catch(() => {});
        if (e instanceof DevkitError) throw e;
        throw new DevkitError("E_SANDBOX", `écriture impossible (${e?.code ?? "erreur"})`);
    }
    return { folder: folderName, files: plan.map((p) => p.parts.join("/")) };
}
