import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runAgent, DevkitError } from "../core/index.mjs";
import { runSandboxed } from "../core/sandbox.mjs";
import { saveLock, readAgentTree, hashEntries } from "../core/lock.mjs";
import { collectWorkspace, resolveWorkspace } from "../core/paths.mjs";

const SKILL = (name, extra = {}) => `---
name: ${name}
description: agent de test
script: run.mjs
permissions:
  read: ${extra.read ?? "workspace"}
  write: ${extra.write ?? "none"}
  network: ${extra.network ?? "none"}
  exec: ${extra.exec ?? "none"}
---
test
`;

async function tmp(prefix) {
    return fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), `dk-${prefix}-`)));
}

// Throwaway DevKit root with a locked agent.
async function makeRoot(name, code, extra) {
    const root = await tmp("root");
    const dir = path.join(root, "agents", name);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "SKILL.md"), SKILL(name, extra));
    await fs.writeFile(path.join(dir, "run.mjs"), code);
    const h = hashEntries(await readAgentTree(dir));
    await saveLock(root, new Map([[name, h]]));
    return { root, dir };
}
async function makeWs(files = { "a.js": "export const a = 1;\n" }) {
    const ws = await tmp("ws");
    for (const [p, c] of Object.entries(files)) {
        await fs.mkdir(path.dirname(path.join(ws, p)), { recursive: true });
        await fs.writeFile(path.join(ws, p), c);
    }
    return ws;
}
const rejects = (p, code) =>
    assert.rejects(p, (e) => e instanceof DevkitError && e.code === code, `attendu ${code}`);

// Runs an agent directly in the sandbox (no lint): proves the boundary holds
// even if a hostile agent passed review.
async function sandboxed(code, over = {}) {
    return runSandboxed({
        entries: [{ rel: "run.mjs", buf: Buffer.from(code) }],
        scriptRel: "run.mjs",
        input: { files: [{ path: "a.js", text: "x" }] },
        timeoutMs: 8000,
        ...over
    });
}
const CORE_FILE = path.resolve(import.meta.dirname, "../core/errors.mjs");
const FORBIDDEN_CHARS = ["\u001b", "\u202e", "\r", "\n", "\u0007"];
const evidenceOf = (res) => res.findings.map((f) => f.evidence);
const probe = (body) => `export default async function () {
  const out = [];
  const t = async (label, fn) => { try { await fn(); out.push(label + ':LEAK'); } catch (e) { out.push(label + ':' + (e.code ?? e.name)); } };
  ${body}
  return out.map((evidence) => ({ evidence }));
}`;

// ---------- inputs ----------
test("nom d'agent : traversal et caractères spéciaux refusés", async () => {
    const ws = await makeWs();
    for (const bad of ["../x", "a/b", "A", "", "a b", "import-doctor/../x", "x\0y", null, 42]) {
        await rejects(runAgent({ name: bad, workspace: ws }), "E_USAGE");
    }
});

test("workspace : racine, home et dossiers système refusés", async () => {
    for (const bad of ["/", os.homedir(), "/etc", "/proc", ""]) {
        await assert.rejects(resolveWorkspace(bad), (e) => e instanceof DevkitError);
    }
});

// ---------- snapshot ----------
test("snapshot : secrets, symlinks, binaires et node_modules jamais lus", async () => {
    const ws = await makeWs({
        "ok.js": "1",
        ".env": "S=1",
        ".env.local": "S=1",
        "credentials.json": "{}",
        "key.pem": "x",
        "node_modules/p/i.js": "x",
        "bin.js": "a\0b"
    });
    await fs.symlink("/etc/passwd", path.join(ws, "link.js"));
    await fs.mkdir(path.join(ws, "sub"));
    await fs.symlink("/etc", path.join(ws, "sub", "etc"));
    const { files, stats } = await collectWorkspace(ws);
    assert.deepEqual(
        files.map((f) => f.path),
        ["ok.js"]
    );
    assert.ok(stats.skipped.symlinks >= 2);
    assert.ok(stats.skipped.sensitive >= 3);
    assert.equal(stats.skipped.binary, 1);
});

test("snapshot : fichier énorme et trop de fichiers => borné, pas de crash", async () => {
    const ws = await makeWs({ "big.js": "x".repeat((1 << 20) + 10) });
    for (let i = 0; i < 30; i++) await fs.writeFile(path.join(ws, `f${i}.js`), "x");
    const { files, stats } = await collectWorkspace(ws);
    assert.equal(stats.skipped.tooLarge, 1);
    assert.equal(files.length, 30);
});

// ---------- locking ----------
test("lock : agent modifié, ajouté ou non verrouillé => refus", async () => {
    const ws = await makeWs();
    const { root, dir } = await makeRoot("probe-agent", "export default () => ({ findings: [] });");
    assert.equal((await runAgent({ name: "probe-agent", workspace: ws, root })).findings.length, 0);

    await fs.appendFile(path.join(dir, "run.mjs"), "\n// silent change\n");
    await rejects(runAgent({ name: "probe-agent", workspace: ws, root }), "E_LOCK");

    const { root: r2, dir: d2 } = await makeRoot(
        "probe-two",
        "export default () => ({ findings: [] });"
    );
    await fs.writeFile(path.join(d2, "extra.mjs"), "export const x = 1;");
    await rejects(runAgent({ name: "probe-two", workspace: ws, root: r2 }), "E_LOCK");

    const { root: r3 } = await makeRoot("probe-three", "export default () => ({ findings: [] });");
    await fs.mkdir(path.join(r3, "agents", "rogue"));
    await fs.writeFile(path.join(r3, "agents", "rogue", "SKILL.md"), SKILL("rogue"));
    await rejects(runAgent({ name: "rogue", workspace: ws, root: r3 }), "E_LOCK");
});

test("agent : symlink ou extension interdite dans le dossier => refus", async () => {
    const ws = await makeWs();
    const { root, dir } = await makeRoot("link-agent", "export default () => ({ findings: [] });");
    await fs.symlink("/etc/passwd", path.join(dir, "notes.txt"));
    await assert.rejects(
        runAgent({ name: "link-agent", workspace: ws, root }),
        (e) => e instanceof DevkitError
    );
    const { root: r2, dir: d2 } = await makeRoot(
        "ext-agent",
        "export default () => ({ findings: [] });"
    );
    await fs.writeFile(path.join(d2, "payload.sh"), "rm -rf /");
    await assert.rejects(
        runAgent({ name: "ext-agent", workspace: ws, root: r2 }),
        (e) => e instanceof DevkitError
    );
});

// ---------- manifest & lint ----------
test("SKILL.md : permissions au-delà du plafond => refus (rien n'est accordé)", async () => {
    const ws = await makeWs();
    for (const extra of [{ write: "workspace" }, { network: "all" }, { exec: "allowed" }]) {
        const { root } = await makeRoot(
            "greedy-agent",
            "export default () => ({ findings: [] });",
            extra
        );
        await rejects(runAgent({ name: "greedy-agent", workspace: ws, root }), "E_POLICY");
    }
});

test("lint : imports et API dangereux refusés avant exécution", async () => {
    const ws = await makeWs();
    const bad = [
        "import cp from 'node:child_process'; export default () => [];",
        "import net from 'net'; export default () => [];",
        "import fs from 'node:fs'; export default () => [];",
        "export default () => eval('1');",
        "export default async () => { await import('node:' + 'net'); return []; };",
        "export default async () => (await fetch('http://x')).json();",
        "export default () => process.binding('fs');",
        "import x from 'left-pad'; export default () => [];"
    ];
    for (const [i, code] of bad.entries()) {
        const { root } = await makeRoot(
            `bad-agent-${i}`.replace(/\d/g, (d) => "abcdefghij"[d]),
            code
        );
        await rejects(
            runAgent({ name: `bad-agent-${"abcdefghij"[i]}`, workspace: ws, root }),
            "E_POLICY"
        );
    }
});

// ---------- sandbox boundary ----------
test("sandbox : fs, écriture, exec, worker, env, réseau, binding = bloqués", async () => {
    const res = await sandboxed(
        probe(`
    const fs = await import('node:fs');
    const cp = await import('node:child_process');
    const wt = await import('node:worker_threads');
    await t('read-etc', () => fs.readFileSync('/etc/hostname'));
    await t('read-core', () => fs.readFileSync(${JSON.stringify(CORE_FILE)}));
    await t('list-root', () => fs.readdirSync('/'));
    await t('write-cwd', () => fs.writeFileSync('pwn.txt', 'x'));
    await t('write-tmp', () => fs.writeFileSync('/tmp/devkit-pwn', 'x'));
    await t('exec', () => cp.execFileSync('/bin/ls'));
    await t('spawn', () => cp.spawnSync('/bin/sh', ['-c', 'id']).error && (() => { throw Object.assign(new Error('x'), { code: 'BLOCKED' }); })());
    await t('worker', () => new wt.Worker('1', { eval: true }));
    await t('fetch', async () => { if (typeof fetch === 'function') await fetch('http://127.0.0.1:1'); else throw Object.assign(new Error('x'), { code: 'NO_FETCH' }); });
    await t('binding', () => { if (typeof process.binding === 'function') process.binding('fs'); else throw Object.assign(new Error('x'), { code: 'NO_BINDING' }); });
    out.push('env:' + Object.keys(process.env).length);
  `)
    );
    const ev = evidenceOf(res).join(" | ");
    assert.ok(!ev.includes("LEAK"), `fuite détectée : ${ev}`);
    assert.match(ev, /read-etc:ERR_ACCESS_DENIED/);
    assert.match(ev, /write-cwd:ERR_ACCESS_DENIED/);
    assert.match(ev, /exec:ERR_ACCESS_DENIED/);
    assert.match(ev, /worker:ERR_ACCESS_DENIED/);
    assert.match(ev, /read-core:ERR_ACCESS_DENIED/);
    assert.match(ev, /fetch:NO_FETCH/);
    assert.match(ev, /env:0/);
});

test("sandbox : la socket réseau est impossible (netns) quand disponible", async () => {
    const res = await sandboxed(
        probe(`
    const net = await import('node:net');
    await t('connect', () => new Promise((ok, ko) => {
      const s = net.connect({ host: '1.1.1.1', port: 80, timeout: 1500 });
      s.on('connect', () => ok()); s.on('error', (e) => ko(e)); s.on('timeout', () => ko(Object.assign(new Error('t'), { code: 'TIMEOUT' })));
    }));
  `)
    );
    const ev = evidenceOf(res).join();
    assert.ok(!ev.includes("LEAK"), `connexion sortante réussie : ${ev}`);
    if (res.isolation.network === "netns")
        assert.match(ev, /connect:(ENETUNREACH|EHOSTUNREACH|ECONNREFUSED|EAI_AGAIN|TIMEOUT)/);
});

test("sandbox : mode strict refuse si pas de netns, sinon passe", async () => {
    try {
        await sandboxed("export default () => [];", { strict: true });
    } catch (e) {
        assert.equal(e.code, "E_SANDBOX");
    }
});

test("budget : boucle infinie => E_TIMEOUT, process tué", async () => {
    const t0 = Date.now();
    await rejects(
        sandboxed("export default () => { for (;;) {} };", { timeoutMs: 1200 }),
        "E_TIMEOUT"
    );
    assert.ok(Date.now() - t0 < 6000);
});

test("budget : fuite mémoire => process tué, pas de crash du parent", async () => {
    await assert.rejects(
        sandboxed(
            "export default () => { const a = []; for (;;) a.push(new Array(1e6).fill(Math.random())); };",
            { memoryMb: 64, timeoutMs: 15000 }
        ),
        (e) => e instanceof DevkitError && ["E_SANDBOX", "E_TIMEOUT", "E_OUTPUT"].includes(e.code)
    );
});

test("budget : flood stdout/stderr => jeté ; flood du résultat => coupé net", async () => {
    const t0 = Date.now();
    await rejects(
        sandboxed(
            "export default () => { for (;;) { process.stdout.write('x'.repeat(65536)); process.stderr.write('y'.repeat(65536)); } };",
            { timeoutMs: 1500 }
        ),
        "E_TIMEOUT"
    );
    assert.ok(Date.now() - t0 < 6000);
    await rejects(
        sandboxed("export default () => [{ evidence: 'x'.repeat(5e6) }];", {
            maxOutputBytes: 1000
        }),
        "E_OUTPUT"
    );
});

test("sortie : bruit sur stdout n'altère pas le résultat", async () => {
    const res = await sandboxed(
        'export default () => { console.log(\'{"ok":true,"findings":[]}\'); return []; };'
    );
    assert.deepEqual(res.findings, []);
});

test("sortie : agent qui plante / ne répond pas / renvoie du non-JSON => erreur propre", async () => {
    await assert.rejects(
        sandboxed('export default () => { throw new Error("boom"); };'),
        (e) => e.code === "E_SANDBOX"
    );
    await assert.rejects(sandboxed("export default () => new Promise(() => {});"), (e) =>
        ["E_OUTPUT", "E_SANDBOX"].includes(e.code)
    );
    await assert.rejects(sandboxed("export default 42;"), (e) => e instanceof DevkitError);
});

// ---------- findings contract (full runner) ----------
test("findings : faux fichiers, clés parasites, ANSI, __proto__, volume => filtrés", async () => {
    const code = `export default () => {
    const ok = { rule: 'x-rule', severity: 'error', file: 'a.js', line: 1, evidence: '\\u001b[31mROUGE\\u001b]0;pwned\\u0007\\u202eabc', message: 'm\\r\\nFAUX PROMPT$ ', confidence: 'high' };
    const arr = [ok,
      { ...ok, file: '/etc/passwd' }, { ...ok, file: '../../x' }, { ...ok, extra: 1 },
      { ...ok, severity: 'critical' }, { ...ok, line: -3 }, { ...ok, line: 1.5 }, { ...ok, rule: 'BAD RULE' },
      JSON.parse('{"__proto__":{"polluted":true},"rule":"x-rule","severity":"error","file":"a.js","line":1,"evidence":"","message":"","confidence":"high"}'),
      null, 'str', 7];
    for (let i = 0; i < 5000; i++) arr.push({ ...ok, line: i + 1 });
    return arr;
  };`;
    const ws = await makeWs();
    const { root } = await makeRoot("forge-agent", code);
    const res = await runAgent({ name: "forge-agent", workspace: ws, root });
    assert.ok(res.findings.length <= 1000);
    assert.ok(res.rejected > 0);
    for (const x of res.findings) {
        assert.equal(x.file, "a.js");
        assert.ok(!FORBIDDEN_CHARS.some((c) => (x.evidence + x.message).includes(c)));
        assert.deepEqual(Object.keys(x).toSorted(), [
            "confidence",
            "evidence",
            "file",
            "line",
            "message",
            "rule",
            "severity"
        ]);
    }
    assert.equal({}.polluted, undefined);
});

test("lecture : l'agent ne voit jamais les secrets du workspace", async () => {
    const ws = await makeWs({
        "a.js": "x",
        ".env": "TOKEN=abc",
        "credentials.json": '{"k":"abc"}'
    });
    const code = `export default (inp) => [{ rule: 'seen-files', severity: 'info', file: 'a.js', line: 1, evidence: inp.files.map(f => f.path).join(','), message: JSON.stringify(inp).includes('abc') ? 'LEAK' : 'clean', confidence: 'high' }];`;
    const { root } = await makeRoot("spy-agent", code);
    const res = await runAgent({ name: "spy-agent", workspace: ws, root });
    assert.equal(res.findings[0].evidence, "a.js");
    assert.equal(res.findings[0].message, "clean");
});

test("read: none => l'agent ne reçoit aucun fichier", async () => {
    const ws = await makeWs();
    const code = `export default (inp) => [{ rule: 'n', severity: 'info', file: 'a.js', line: 1, evidence: String(inp.files.length), message: 'm', confidence: 'high' }];`;
    const { root } = await makeRoot("blind-agent", code, { read: "none" });
    const res = await runAgent({ name: "blind-agent", workspace: ws, root });
    assert.equal(res.findings.length, 0); // no known file => finding rejected
    assert.equal(res.workspace.files, 0);
});

test("nettoyage : aucun dossier temporaire devkit-* ne traîne", async () => {
    const before = (await fs.readdir(os.tmpdir())).filter((n) => n.startsWith("devkit-")).length;
    await sandboxed("export default () => [];");
    await sandboxed('export default () => { throw new Error("x"); };').catch(() => {});
    await sandboxed("export default () => { for (;;) {} };", { timeoutMs: 600 }).catch(() => {});
    const after = (await fs.readdir(os.tmpdir())).filter((n) => n.startsWith("devkit-")).length;
    assert.equal(after, before);
});
