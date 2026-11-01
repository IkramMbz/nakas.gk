// agents.lock: sha256 fingerprint of each agent folder.
// The folder is read once into memory; that verified copy is materialized in a private
// temp dir and executed (no TOCTOU).
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { DevkitError } from "./errors.mjs";
import { LIMITS, AGENT_EXT } from "./policy.mjs";

const FILE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const NAME_RE = /^[a-z][a-z0-9-]{1,39}$/;
const HEX = /^[0-9a-f]{64}$/;

const byCode = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export async function readAgentTree(dir) {
    const entries = [];
    let total = 0;
    async function walk(abs, rel, depth) {
        if (depth > LIMITS.agentMaxDepth)
            throw new DevkitError("E_POLICY", "agent : arborescence trop profonde");
        const names = await fs.readdir(abs, { withFileTypes: true });
        for (const d of names) {
            if (!FILE_RE.test(d.name))
                throw new DevkitError(
                    "E_POLICY",
                    `agent : nom de fichier refusé (${JSON.stringify(d.name)})`
                );
            const a = path.join(abs, d.name);
            const r = rel ? `${rel}/${d.name}` : d.name;
            if (d.isSymbolicLink())
                throw new DevkitError("E_POLICY", `agent : lien symbolique interdit (${r})`);
            if (d.isDirectory()) {
                if (d.name === "node_modules")
                    throw new DevkitError(
                        "E_POLICY",
                        "agent : node_modules interdit (zéro dépendance)"
                    );
                await walk(a, r, depth + 1);
                continue;
            }
            if (!d.isFile())
                throw new DevkitError("E_POLICY", `agent : fichier spécial interdit (${r})`);
            if (!AGENT_EXT.has(path.extname(d.name).toLowerCase())) {
                throw new DevkitError(
                    "E_POLICY",
                    `agent : extension non autorisée (${r}) — permis : ${[...AGENT_EXT].join(" ")}`
                );
            }
            if (entries.length >= LIMITS.agentMaxFiles)
                throw new DevkitError("E_POLICY", "agent : trop de fichiers");
            const st = await fs.lstat(a);
            if (st.size > LIMITS.agentMaxFileBytes)
                throw new DevkitError("E_POLICY", `agent : fichier trop gros (${r})`);
            total += st.size;
            if (total > LIMITS.agentMaxTotalBytes)
                throw new DevkitError("E_POLICY", "agent : dossier trop gros");
            entries.push({ rel: r, buf: await fs.readFile(a) });
        }
    }
    await walk(dir, "", 0);
    entries.sort((a, b) => byCode(a.rel, b.rel));
    return entries;
}

// CRLF → LF so git autocrlf can't change the fingerprint.
const normalize = (buf) => Buffer.from(buf.toString("latin1").replace(/\r\n/g, "\n"), "latin1");

export function hashEntries(entries) {
    const h = createHash("sha256");
    for (const e of entries) {
        h.update(`${e.rel}\0${createHash("sha256").update(normalize(e.buf)).digest("hex")}\n`);
    }
    return h.digest("hex");
}

export async function loadLock(root) {
    const file = path.join(root, "agents.lock");
    let raw;
    try {
        const st = await fs.lstat(file);
        if (!st.isFile() || st.size > 64 << 10) throw new Error("bad");
        raw = await fs.readFile(file, "utf8");
    } catch {
        throw new DevkitError("E_LOCK", "agents.lock absent ou illisible (lance : devkit lock)");
    }
    let json;
    try {
        json = JSON.parse(raw);
    } catch {
        throw new DevkitError("E_LOCK", "agents.lock : JSON invalide");
    }
    if (
        !json ||
        json.lockfileVersion !== 1 ||
        typeof json.agents !== "object" ||
        json.agents === null
    ) {
        throw new DevkitError("E_LOCK", "agents.lock : format inattendu");
    }
    const out = new Map();
    for (const [name, v] of Object.entries(json.agents)) {
        if (!NAME_RE.test(name) || !v || typeof v.sha256 !== "string" || !HEX.test(v.sha256)) {
            throw new DevkitError("E_LOCK", "agents.lock : entrée invalide");
        }
        out.set(name, v.sha256);
    }
    return out;
}

export async function saveLock(root, map) {
    const agents = {};
    for (const name of [...map.keys()].toSorted(byCode)) agents[name] = { sha256: map.get(name) };
    await fs.writeFile(
        path.join(root, "agents.lock"),
        JSON.stringify({ lockfileVersion: 1, agents }, null, 2) + "\n"
    );
}

export async function listAgentNames(root) {
    const dir = path.join(root, "agents");
    const names = [];
    for (const d of await fs.readdir(dir, { withFileTypes: true })) {
        if (d.name === "README.md" || d.name === ".gitkeep") continue;
        if (!d.isDirectory() || !NAME_RE.test(d.name)) {
            throw new DevkitError(
                "E_POLICY",
                `agents/ : entrée inattendue (${JSON.stringify(d.name)})`
            );
        }
        names.push(d.name);
    }
    return names.toSorted(byCode);
}
