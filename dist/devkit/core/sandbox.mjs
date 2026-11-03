// Single execution gate. An agent runs in a child process:
//  - `node --permission`: read limited to host.mjs + private agent copy; no write,
//    no child_process, no worker, no native addon;
//  - empty env, cwd = temp copy, stdin/fd3 for I/O, no shell;
//  - network cut by an empty network namespace (Linux) when available;
//  - hard timeout (SIGKILL on the group), V8 memory cap, output caps;
//  - 0700 temp copy removed in all cases.
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DevkitError } from "./errors.mjs";
import { LIMITS, MIN_NODE, isNodeSupported } from "./policy.mjs";
import { cleanText } from "./sanitize.mjs";

const HOST_PATH = fileURLToPath(new URL("./host.mjs", import.meta.url));

function assertNode() {
    if (isNodeSupported()) return;
    throw new DevkitError(
        "E_SANDBOX",
        `Node ≥ ${MIN_NODE.join(".")} requis (--permission), trouvé ${process.versions.node}`
    );
}

let netnsProbe;
function probeNetns() {
    netnsProbe ??= new Promise((resolve) => {
        if (process.platform !== "linux") return resolve(null);
        const bin = ["/usr/bin/unshare", "/bin/unshare"].find((p) => existsSync(p));
        if (!bin) return resolve(null);
        const c = spawn(bin, ["-rn", "--", process.execPath, "-e", "process.exit(0)"], {
            stdio: "ignore",
            env: {},
            timeout: 5000
        });
        c.on("error", () => resolve(null));
        c.on("close", (code) => resolve(code === 0 ? bin : null));
    });
    return netnsProbe;
}

// If the parent dies, leave no orphaned child.
const live = new Set();
let exitHooked = false;
function hookExit() {
    if (exitHooked) return;
    exitHooked = true;
    process.on("exit", () => {
        for (const c of live) {
            try {
                c.kill("SIGKILL");
            } catch {
                /* already dead */
            }
        }
    });
}

function killTree(child) {
    try {
        if (process.platform !== "win32") process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
    } catch {
        try {
            child.kill("SIGKILL");
        } catch {
            /* already dead */
        }
    }
}

export async function runSandboxed({
    entries,
    scriptRel,
    input,
    strict = false,
    timeoutMs = LIMITS.timeoutMs,
    memoryMb = LIMITS.memoryMb,
    maxOutputBytes = LIMITS.maxOutputBytes
}) {
    assertNode();
    hookExit();
    const unshareBin = await probeNetns();
    if (strict && !unshareBin) {
        throw new DevkitError(
            "E_SANDBOX",
            "mode strict : isolation réseau (namespace) indisponible sur cette machine"
        );
    }
    if (HOST_PATH.includes(","))
        throw new DevkitError("E_SANDBOX", "chemin d'installation avec une virgule : refusé");

    const tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "devkit-"))); // 0700
    try {
        const agentDir = path.join(tmp, "agent");
        if (agentDir.includes(","))
            throw new DevkitError("E_SANDBOX", "dossier temporaire avec une virgule : refusé");
        await fs.mkdir(agentDir, { mode: 0o700 });
        for (const { rel, buf } of entries) {
            const dest = path.join(agentDir, ...rel.split("/"));
            await fs.mkdir(path.dirname(dest), { recursive: true, mode: 0o700 });
            await fs.writeFile(dest, buf, { mode: 0o400 });
        }
        const script = path.join(agentDir, scriptRel);
        const payload = JSON.stringify(input);

        const nodeArgs = [
            "--permission",
            `--allow-fs-read=${HOST_PATH}`,
            `--allow-fs-read=${agentDir}`,
            `--max-old-space-size=${memoryMb}`,
            "--disable-proto=delete",
            HOST_PATH,
            script
        ];
        const cmd = unshareBin ?? process.execPath;
        const args = unshareBin ? ["-rn", "--", process.execPath, ...nodeArgs] : nodeArgs;

        const child = spawn(cmd, args, {
            cwd: agentDir,
            env: {},
            shell: false,
            windowsHide: true,
            detached: process.platform !== "win32",
            stdio: ["pipe", "ignore", "ignore", "pipe"] // stdout/stderr -> /dev/null: no flood channel
        });
        live.add(child);

        let killedFor = null;
        const kill = (why) => {
            if (!killedFor) {
                killedFor = why;
                killTree(child);
            }
        };
        let outBytes = 0;
        const outChunks = [];

        const result = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => kill("timeout"), timeoutMs);
            child.stdio[3].on("data", (c) => {
                outBytes += c.length;
                if (outBytes > maxOutputBytes) return kill("output");
                outChunks.push(c);
            });
            for (const s of [child.stdin, child.stdio[3]]) s.on("error", () => {});
            child.on("error", (e) => {
                clearTimeout(timer);
                reject(
                    new DevkitError("E_SANDBOX", `lancement impossible : ${e.code ?? e.message}`)
                );
            });
            child.on("close", (code, signal) => {
                clearTimeout(timer);
                resolve({ code, signal });
            });
            child.stdin.end(payload);
        }).finally(() => {
            live.delete(child);
        });

        if (killedFor === "timeout")
            throw new DevkitError(
                "E_TIMEOUT",
                `agent interrompu : budget de ${timeoutMs} ms dépassé`
            );
        if (killedFor)
            throw new DevkitError("E_OUTPUT", "agent interrompu : résultat trop volumineux");
        if (result.code !== 0 && outChunks.length === 0) {
            throw new DevkitError(
                "E_SANDBOX",
                `agent terminé anormalement (code=${result.code} signal=${result.signal}) — mémoire ou plantage`
            );
        }
        let parsed;
        try {
            parsed = JSON.parse(Buffer.concat(outChunks).toString("utf8"));
        } catch {
            throw new DevkitError("E_OUTPUT", "sortie de l'agent absente ou non JSON");
        }
        if (!parsed || typeof parsed !== "object")
            throw new DevkitError("E_OUTPUT", "sortie de l'agent invalide");
        if (parsed.ok !== true)
            throw new DevkitError(
                "E_SANDBOX",
                `l'agent a échoué : ${cleanText(String(parsed.error ?? ""), 200)}`
            );
        return {
            findings: parsed.findings,
            artifacts: parsed.artifacts,
            isolation: {
                fsRead: "node-permission",
                network: unshareBin ? "netns" : "best-effort",
                exec: "blocked",
                write: "blocked"
            }
        };
    } finally {
        await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
    }
}
