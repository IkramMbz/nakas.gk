// CSS guard: unused CSS classes, classes in code missing from CSS, dead variables.
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const walk = (dir, out = []) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else out.push(p);
    }
    return out;
};

const css = walk(join(root, "src/styles"))
    .filter((f) => f.endsWith(".css") && !f.endsWith("index.css"))
    .map((f) => readFileSync(f, "utf8"))
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "");
const code = walk(join(root, "src"))
    .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.(test|generated)\./.test(f))
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");

const cssClasses = new Set([...css.matchAll(/\.(nakas-[a-z0-9-]+)/g)].map((m) => m[1]));
// Classes actually applied: className="…" attributes and ".nakas-x" selectors in querySelector.
const usedClasses = new Set([
    ...[...code.matchAll(/className=\s*"([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)),
    ...[...code.matchAll(/["'`]\.(nakas-[a-z0-9-]+)/g)].map((m) => m[1])
]);
const defined = new Set([...css.matchAll(/(--nakas-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
const referenced = new Set([...css.matchAll(/var\((--nakas-[a-z0-9-]+)/g)].map((m) => m[1]));
const setInCode = new Set([...code.matchAll(/["'`](--nakas-[a-z0-9-]+)["'`]/g)].map((m) => m[1]));

const problems = [];
for (const c of cssClasses) if (!usedClasses.has(c)) problems.push(`classe CSS inutilisée : .${c}`);
for (const c of usedClasses)
    if (!cssClasses.has(c)) problems.push(`classe du code sans règle CSS : ${c}`);
for (const v of referenced)
    if (!defined.has(v) && !setInCode.has(v))
        problems.push(`variable utilisée mais jamais définie : ${v}`);
for (const v of defined)
    if (!referenced.has(v)) problems.push(`variable définie mais jamais utilisée : ${v}`);

if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
}
console.log(`css:check OK (${cssClasses.size} classes, ${defined.size} variables)`);
