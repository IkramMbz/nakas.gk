// Child process entry point. Launched with `node --permission`: at this stage
// the process has NO fs access outside this file and the agent folder,
// no write, child_process, worker or native addon. Empty env.
// Contract: stdin = input JSON; fd 3 = output JSON; stdout/stderr = /dev/null.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function writeAll(fd, str) {
    const buf = Buffer.from(str, "utf8");
    let off = 0;
    while (off < buf.length) {
        try {
            off += fs.writeSync(fd, buf, off, buf.length - off);
        } catch (e) {
            if (e.code !== "EAGAIN") throw e;
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5);
        }
    }
}

// Failure: the message goes on the result channel (stdout/stderr are discarded by the parent).
const die = (msg, code = 70) => {
    try {
        writeAll(3, JSON.stringify({ ok: false, error: `host: ${msg}` }));
    } catch {
        /* nothing */
    }
    process.exit(code);
};

const agentPath = process.argv[2];
if (!agentPath) die("script manquant");

// 1. Fail closed: if the permission model is not really active, run nothing.
const here = path.dirname(fileURLToPath(import.meta.url));
try {
    fs.readFileSync(path.join(here, "errors.mjs"));
    die("modèle de permissions inactif (lecture hors périmètre possible)");
} catch (e) {
    if (e?.code !== "ERR_ACCESS_DENIED") die("modèle de permissions inactif");
}
try {
    fs.writeFileSync(path.join(path.dirname(agentPath), ".canary"), "");
    die("modèle de permissions inactif (écriture possible)");
} catch (e) {
    if (e?.code !== "ERR_ACCESS_DENIED") die("modèle de permissions inactif");
}

// 2. Remove global network APIs (belt; suspenders are the parent-side netns).
for (const k of ["fetch", "WebSocket", "EventSource", "XMLHttpRequest"]) {
    try {
        Object.defineProperty(globalThis, k, {
            value: undefined,
            writable: false,
            configurable: false
        });
    } catch {
        /* absent */
    }
}
for (const k of ["binding", "_linkedBinding", "dlopen", "kill", "abort", "chdir"]) {
    try {
        Object.defineProperty(process, k, {
            value: undefined,
            writable: false,
            configurable: false
        });
    } catch {
        /* absent */
    }
}

// 3. Bounded input read.
const MAX_IN = 64 << 20;
const chunks = [];
let size = 0;
for await (const c of process.stdin) {
    size += c.length;
    if (size > MAX_IN) die("entrée trop grosse");
    chunks.push(c);
}
let input;
try {
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
} catch {
    die("entrée JSON invalide");
}

// 4. Run the agent.
let out;
try {
    const mod = await import(pathToFileURL(agentPath).href);
    if (typeof mod.default !== "function") die("l'agent doit exporter une fonction par défaut");
    const res = await mod.default(input);
    const findings = Array.isArray(res) ? res : res?.findings;
    out = { ok: true, findings };
} catch (e) {
    out = { ok: false, error: String(e?.message ?? e).slice(0, 300) };
}
try {
    writeAll(3, JSON.stringify(out));
} catch {
    die("écriture du résultat impossible");
}
process.exit(out.ok ? 0 : 1);
