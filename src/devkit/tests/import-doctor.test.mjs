import test from "node:test";
import assert from "node:assert/strict";
import run from "../agents/import-doctor/run.mjs";
import { tokenize, extractImports } from "../agents/import-doctor/lexer.mjs";

const specs = (src) =>
    extractImports(tokenize(src)).map((i) => `${i.kind}:${i.spec}${i.typeOnly ? ":type" : ""}`);
const rules = (files) =>
    run({ files, skipDirNames: ["dist"] }).findings.map((f) => `${f.rule}@${f.file}:${f.line}`);

test("lexer : ignore commentaires, chaînes, regex ; gère templates et TS", () => {
    assert.deepEqual(
        specs(`
    // import a from 'c1'
    /* import b from 'c2' */
    const s = "import x from 'c3'"; const r = /import y from 'c4'/; const d = 4 / 2;
    const t = \`\${await import('t1')} import z from 'c5'\`;
    import a from 'a1'; import type { T } from 'a2'; import { type U } from 'a3';
    export { q } from 'e1'; export * from 'e2'; export type { V } from 'e3'; export const k = 1;
    const m = require('r1'); obj.require('no'); import 'side';
  `),
        [
            "dynamic:t1",
            "import:a1",
            "import:a2:type",
            "import:a3",
            "export:e1",
            "export:e2",
            "export:e3:type",
            "require:r1",
            "import:side"
        ]
    );
});

test("lexer : entrées pathologiques ne plantent pas et restent rapides", () => {
    const t0 = Date.now();
    for (const src of [
        "`" + "${".repeat(5000),
        "/".repeat(100000),
        '"'.repeat(100000),
        "(".repeat(200000),
        "import ".repeat(50000),
        "\u0000".repeat(1000)
    ]) {
        try {
            tokenize(src);
        } catch (e) {
            assert.ok(e instanceof RangeError);
        }
    }
    assert.ok(Date.now() - t0 < 4000);
});

test("agent : cas de base", () => {
    const r = rules([
        {
            path: "package.json",
            text: '{"name":"d","dependencies":{"react":"1"},"devDependencies":{"@types/node":"1"}}'
        },
        {
            path: "src/a.ts",
            text: "import React from 'react';\nimport x from 'lodash';\nimport { b } from './b';\nimport './missing';\nimport s from './s.css';\nimport fs from 'node:fs';\nimport '@/alias';"
        },
        { path: "src/b.ts", text: "import { a } from './a.js';" }
    ]);
    assert.deepEqual(r.toSorted(), [
        "import-cycle@src/a.ts:3",
        "missing-dependency@src/a.ts:2",
        "missing-file@src/a.ts:4"
    ]);
});

test("agent : imports de types ne créent pas de cycle, dossiers ignorés ne sont pas des erreurs", () => {
    const r = rules([
        { path: "package.json", text: "{}" },
        { path: "a.ts", text: "import type { B } from './b'; import './dist/gen.js';" },
        { path: "b.ts", text: "import { A } from './a';" }
    ]);
    assert.deepEqual(r, []);
});
