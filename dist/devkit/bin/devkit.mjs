#!/usr/bin/env node
import path from "node:path";
import { runAgent, DEFAULT_ROOT, DevkitError, EXIT_CODES } from "../core/index.mjs";
import { loadAgent } from "../core/agent.mjs";
import { listAgentNames, loadLock, saveLock } from "../core/lock.mjs";
import { cleanText } from "../core/sanitize.mjs";

const HELP = `devkit — agents de diagnostic locaux, lecture seule, isolés

  devkit run <agent> [workspace] [--json] [--strict]
  devkit list
  devkit verify      vérifie agents/ contre agents.lock (CI)
  devkit lock        recalcule agents.lock (après relecture du diff !)

Codes de sortie : 0 ok · 1 erreurs trouvées · 2 usage · 3 refus de sécurité`;

const print = (s) => process.stdout.write(`${s}\n`);

function parse(argv) {
    const flags = new Set();
    const pos = [];
    for (const a of argv) {
        if (a.startsWith("--")) flags.add(a);
        else pos.push(a);
    }
    for (const f of flags)
        if (!["--json", "--strict", "--help"].includes(f))
            throw new DevkitError("E_USAGE", `option inconnue : ${cleanText(f, 40)}`);
    return { flags, pos };
}

async function main() {
    const { flags, pos } = parse(process.argv.slice(2));
    const [cmd, ...rest] = pos;
    if (!cmd || flags.has("--help") || cmd === "help") {
        print(HELP);
        return 0;
    }

    if (cmd === "list") {
        const lock = await loadLock(DEFAULT_ROOT).catch(() => new Map());
        for (const n of await listAgentNames(DEFAULT_ROOT)) {
            const a = await loadAgent(DEFAULT_ROOT, n, { requireLock: false });
            print(
                `${n}${lock.get(n) === a.sha256 ? "" : "  [NON VERROUILLÉ]"}  — ${cleanText(a.description, 120)}`
            );
        }
        return 0;
    }

    if (cmd === "verify" || cmd === "lock") {
        const names = await listAgentNames(DEFAULT_ROOT);
        const next = new Map();
        for (const n of names)
            next.set(n, (await loadAgent(DEFAULT_ROOT, n, { requireLock: false })).sha256);
        if (cmd === "lock") {
            await saveLock(DEFAULT_ROOT, next);
            print(`agents.lock écrit (${names.length} agent(s))`);
            return 0;
        }
        const lock = await loadLock(DEFAULT_ROOT);
        const bad = [...next]
            .filter(([n, h]) => lock.get(n) !== h)
            .map(([n]) => n)
            .concat([...lock.keys()].filter((n) => !next.has(n)));
        if (bad.length)
            throw new DevkitError("E_LOCK", `empreintes non conformes : ${bad.join(", ")}`);
        print("agents.lock conforme");
        return 0;
    }

    if (cmd === "run") {
        const [agent, ws = "."] = rest;
        const res = await runAgent({
            name: agent,
            workspace: path.resolve(ws),
            strict: flags.has("--strict")
        });
        if (flags.has("--json")) {
            print(JSON.stringify(res, null, 2));
        } else {
            for (const f of res.findings) {
                print(
                    `${f.file}:${f.line}  ${f.severity.toUpperCase()} [${f.rule}] ${f.message}  (confiance : ${f.confidence})`
                );
                if (f.evidence) print(`    > ${f.evidence}`);
            }
            const n = (s) => res.findings.filter((f) => f.severity === s).length;
            print(
                `\n${res.agent.name} : ${n("error")} erreur(s), ${n("warning")} avertissement(s), ${n("info")} info — ${res.workspace.files} fichiers lus en ${res.durationMs} ms`
            );
            if (res.workspace.truncated)
                print("⚠ workspace tronqué (limites atteintes) : résultats partiels");
            if (res.rejected)
                print(`⚠ ${res.rejected} finding(s) invalide(s) rejeté(s) par le runner`);
            if (res.isolation.network !== "netns")
                print(
                    '⚠ isolation réseau en mode "best-effort" (pas de namespace) — voir SECURITY.md, utilise --strict pour refuser'
                );
        }
        return res.findings.some((f) => f.severity === "error") ? 1 : 0;
    }
    throw new DevkitError("E_USAGE", `commande inconnue : ${cleanText(cmd, 40)}`);
}

try {
    process.exitCode = await main();
} catch (e) {
    if (e instanceof DevkitError) {
        process.stderr.write(`devkit [${e.code}] ${e.message}\n`);
        process.exitCode = EXIT_CODES[e.code] ?? 3;
    } else {
        process.stderr.write("devkit : erreur interne\n");
        process.exitCode = 70;
    }
}
