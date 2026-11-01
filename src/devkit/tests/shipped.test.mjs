// Ensures the security mechanisms are WIRED to the agents actually shipped:
// lock up to date, agent run in the sandbox, result identical to direct execution.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
    DEFAULT_ROOT,
    DevkitError,
    listAgentNames,
    loadAgent,
    loadLock,
    runAgent,
    workspaceFingerprint
} from "../core/index.mjs";
import { isNodeSupported } from "../core/policy.mjs";
import { parseSkill } from "../core/frontmatter.mjs";
import { collectWorkspace, normalizeInclude } from "../core/paths.mjs";
import run from "../agents/import-doctor/run.mjs";

const CLI = path.join(DEFAULT_ROOT, "bin", "devkit.mjs");

const key = (f) => `${f.rule}@${f.file}:${f.line}`;

async function project(files) {
    const ws = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "dk-ship-")));
    for (const [p, c] of Object.entries(files)) {
        await fs.mkdir(path.dirname(path.join(ws, p)), { recursive: true });
        await fs.writeFile(path.join(ws, p), c);
    }
    return ws;
}

const mk = (indent) =>
    Buffer.from(
        `---\nname: demo\ndescription: d\nscript: run.mjs\npermissions:\n${indent}read: none\n${indent}write: none\n${indent}network: none\n${indent}exec: none\n---\n`
    );

const FILES = {
    "package.json": '{"name":"p","type":"module","dependencies":{"react":"1"}}',
    "src/a.ts": "import x from 'lodash';\nimport { b } from './b.js';\nimport './nope.js';",
    "src/b.ts": "import { a } from './a.js';",
    "docs/ignored.ts": "import './also-missing.js';"
};

test("agents.lock couvre exactement les agents livrés, sans écart d'empreinte", async () => {
    const names = await listAgentNames(DEFAULT_ROOT);
    const lock = await loadLock(DEFAULT_ROOT);
    assert.deepEqual([...lock.keys()].toSorted(), names);
    for (const n of names) {
        const a = await loadAgent(DEFAULT_ROOT, n, { requireLock: true });
        assert.equal(lock.get(n), a.sha256, `${n} : empreinte différente du verrou`);
    }
});

test("CLI : verify et list fonctionnent (CI)", () => {
    assert.match(execFileSync(process.execPath, [CLI, "verify"], { encoding: "utf8" }), /conforme/);
    assert.match(
        execFileSync(process.execPath, [CLI, "list"], { encoding: "utf8" }),
        /import-doctor/
    );
});

test("import-doctor : sandbox == exécution directe (pas de dérive entre les deux chemins)", async () => {
    const ws = await project(FILES);
    const res = await runAgent({ name: "import-doctor", workspace: ws });
    const { files } = await collectWorkspace(ws);
    const direct = run({ files, truncated: false, skipDirNames: [] }).findings;
    assert.deepEqual(res.findings.map(key).toSorted(), direct.map(key).toSorted());
    assert.ok(res.findings.some((f) => f.rule === "missing-dependency"));
    assert.ok(res.findings.some((f) => f.rule === "missing-file"));
    assert.equal(res.isolation.exec, "blocked");
});

test("include : seul le périmètre demandé est lu (+ package.json racine), confiance réduite", async () => {
    const ws = await project(FILES);
    const res = await runAgent({ name: "import-doctor", workspace: ws, include: ["src"] });
    assert.equal(res.workspace.partial, true);
    assert.ok(!res.findings.some((f) => f.file.startsWith("docs/")));
    const miss = res.findings.find((f) => f.rule === "missing-file");
    assert.equal(miss?.confidence, "medium");
    const full = await runAgent({ name: "import-doctor", workspace: ws });
    assert.ok(full.findings.some((f) => f.file === "docs/ignored.ts"));
});

test("include : traversal, chemin absolu, lien symbolique et dossier absent refusés", async () => {
    const ws = await project(FILES);
    for (const bad of [["../x"], ["/etc"], ["C:/Windows"], ["src/../.."], [], [42], "src"]) {
        await assert.rejects(
            runAgent({ name: "import-doctor", workspace: ws, include: bad }),
            (e) => e instanceof DevkitError
        );
    }
    await fs.symlink("/etc", path.join(ws, "lnk"));
    await assert.rejects(
        runAgent({ name: "import-doctor", workspace: ws, include: ["lnk"] }),
        (e) => e instanceof DevkitError && e.code === "E_POLICY"
    );
    await assert.rejects(
        runAgent({ name: "import-doctor", workspace: ws, include: ["absent"] }),
        (e) => e instanceof DevkitError && e.code === "E_USAGE"
    );
    assert.deepEqual(normalizeInclude(["./src/", "src", "lib"]), ["lib", "src"]);
    assert.deepEqual(normalizeInclude(["src", "."]), ["."]);
});

test("empreinte : stable sans changement, change à la modification, ignore les secrets", async () => {
    const ws = await project({ ...FILES, ".env": "A=1" });
    const a = await workspaceFingerprint({ workspace: ws, include: ["src"] });
    assert.equal(a, await workspaceFingerprint({ workspace: ws, include: ["src"] }));
    await fs.writeFile(path.join(ws, ".env"), "A=2");
    assert.equal(a, await workspaceFingerprint({ workspace: ws, include: ["src"] }));
    await fs.appendFile(path.join(ws, "src", "b.ts"), "\n// edit");
    assert.notEqual(a, await workspaceFingerprint({ workspace: ws, include: ["src"] }));
});

test("SKILL.md : indentation 2 ou 4 espaces acceptée, tabulation refusée", () => {
    assert.equal(parseSkill(mk("  "), "demo").permissions.read, "none");
    assert.equal(parseSkill(mk("    "), "demo").permissions.read, "none");
    assert.throws(() => parseSkill(mk("\t"), "demo"), DevkitError);
});

test("Node : la version minimale exacte est acceptée (régression)", () => {
    assert.equal(isNodeSupported("22.13.0"), true);
    assert.equal(isNodeSupported("22.12.9"), false);
    assert.equal(isNodeSupported("23.0.0"), true);
    assert.equal(isNodeSupported("20.19.0"), false);
});
