// Verifies the built package: resolvable exports, Node-free client, standalone bundle, working devkit.
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "dist");
const errors = [];
const walk = (d, out = []) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p, out);
        else out.push(p);
    }
    return out;
};

// 1. Every package.json export loads (self-reference, as a consumer would).
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const server = await import("nakas-gk/server");
for (const name of ["createNakasHandler", "createNakasMiddleware", "nakas", "startNakasServer"]) {
    if (typeof server[name] !== "function") errors.push(`nakas-gk/server : « ${name} » manquant`);
}
const main = await import("nakas-gk");
if (typeof main.mountNakas !== "function") errors.push("nakas-gk : mountNakas manquant");
const avatars = await import("nakas-gk/avatars");
if (typeof avatars.createAvatar !== "function")
    errors.push("nakas-gk/avatars : createAvatar manquant");
const devkit = await import("nakas-gk/devkit");
if (typeof devkit.runAgent !== "function") errors.push("nakas-gk/devkit : runAgent manquant");
for (const key of Object.keys(pkg.exports)) {
    const target = pkg.exports[key];
    const file = typeof target === "string" ? target : target.default;
    if (!walk(dist).includes(join(root, file)) && key !== "./package.json")
        errors.push(`export ${key} : ${file} absent`);
}

// 2. Client code depends on neither Node nor a build tool.
const CLIENT = ["index.js", "auto.js", "react.js", "standalone.js"];
const clientFiles = walk(dist).filter((f) => {
    const rel = f.slice(dist.length + 1);
    return (
        f.endsWith(".js") &&
        (CLIENT.includes(rel) || /^(core|ui|browser|agents)\//.test(rel)) &&
        !/server\.js$|tools\.server\.js$/.test(rel)
    );
});
for (const f of clientFiles) {
    const src = readFileSync(f, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
    if (/from\s*["']node:|require\(["']node:/.test(src)) errors.push(`${f} : import node:*`);
    if (/import\.meta\.env|process\.env/.test(src) && !f.endsWith("standalone.js"))
        errors.push(`${f} : lecture d'environnement de build`);
}
// 3. The standalone bundle imports nothing external.
const bundle = readFileSync(join(dist, "standalone.js"), "utf8");
if (/(?:from|import)\s*["'](?:react|react-dom)[^"']*["']/.test(bundle))
    errors.push("standalone.js : import nu de react");
if (/(?:from|import\()\s*["']node:/.test(bundle)) errors.push("standalone.js : import node:*");

// 4. The shipped devkit actually runs the locked agent in the sandbox.
const { mkdtempSync, writeFileSync } = await import("node:fs");
const { tmpdir } = await import("node:os");
const ws = mkdtempSync(join(tmpdir(), "nakas-pack-"));
writeFileSync(join(ws, "package.json"), "{}");
writeFileSync(join(ws, "a.mjs"), "import './absent.mjs';\n");
const res = await devkit.runAgent({ name: "import-doctor", workspace: ws });
if (!res.findings.some((f) => f.rule === "missing-file"))
    errors.push("devkit : import cassé non détecté");

if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
}
console.log(`verify:pack OK (${clientFiles.length} fichiers client contrôlés)`);
