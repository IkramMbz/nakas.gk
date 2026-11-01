// Full build: generate → tsc (client + server) → standalone bundle → copy devkit → verify lock.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "dist");
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: "inherit" });
const tsc = join(root, "node_modules", "typescript", "bin", "tsc");

run(process.execPath, ["scripts/generate.mjs"]);
rmSync(dist, { recursive: true, force: true });

// 1. Compile (two projects: one without Node types, one without DOM).
run(process.execPath, [tsc, "-p", "tsconfig.client.build.json"]);
run(process.execPath, [tsc, "-p", "tsconfig.server.build.json"]);

// 2. Standalone bundle: replaces dist/standalone.js with a build that embeds React + UI + CSS.
await build({
    entryPoints: [join(root, "src/standalone.ts")],
    outfile: join(dist, "standalone.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    legalComments: "none",
    logLevel: "warning",
    allowOverwrite: true
});

// 3. DevKit: plain JS copied as-is (no tests) so `agents.lock` stays valid.
cpSync(join(root, "src/devkit"), join(dist, "devkit"), {
    recursive: true,
    filter: (src) => !src.includes(`${join("src", "devkit", "tests")}`)
});
mkdirSync(join(dist, "avatars"), { recursive: true });
if (existsSync(join(root, "src/avatars/NOTICE.md"))) {
    cpSync(join(root, "src/avatars/NOTICE.md"), join(dist, "avatars/NOTICE.md"));
}

// 4. The shipped devkit must match its lock.
run(process.execPath, [join(dist, "devkit/bin/devkit.mjs"), "verify"]);
console.log("build OK");
