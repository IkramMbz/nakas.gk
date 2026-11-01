// Static import analysis over an in-memory snapshot of files.
// Input: { files: [{ path, text }], truncated, skipDirNames }. Output: { findings }.
import { extractImports, tokenize } from "./lexer.mjs";

const BUILTINS = new Set([
    "assert",
    "assert/strict",
    "async_hooks",
    "buffer",
    "child_process",
    "cluster",
    "console",
    "constants",
    "crypto",
    "dgram",
    "diagnostics_channel",
    "dns",
    "dns/promises",
    "domain",
    "events",
    "fs",
    "fs/promises",
    "http",
    "http2",
    "https",
    "inspector",
    "module",
    "net",
    "os",
    "path",
    "path/posix",
    "path/win32",
    "perf_hooks",
    "process",
    "punycode",
    "querystring",
    "readline",
    "readline/promises",
    "repl",
    "stream",
    "stream/promises",
    "stream/web",
    "stream/consumers",
    "string_decoder",
    "sys",
    "timers",
    "timers/promises",
    "tls",
    "trace_events",
    "tty",
    "url",
    "util",
    "util/types",
    "v8",
    "vm",
    "wasi",
    "worker_threads",
    "zlib",
    "test",
    "sqlite",
    "sea"
]);
const NODE_ONLY = new Set(["test", "sqlite", "sea"]); // Only valid with the "node:" prefix
const EXTS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json"];
const JS_TO_TS = {
    ".js": [".ts", ".tsx", ".d.ts"],
    ".mjs": [".mts", ".d.mts"],
    ".cjs": [".cts", ".d.cts"],
    ".jsx": [".tsx"]
};
const ASSET_OR_OTHER = /\.[A-Za-z0-9]+$/;
const CODE_EXT = /\.(?:[cm]?[jt]sx?|json)$/;
const MAX_FINDINGS = 500;

const isRecord = (v) => typeof v === "object" && v !== null;

const posix = {
    dirname: (p) => {
        const i = p.lastIndexOf("/");
        return i === -1 ? "" : p.slice(0, i);
    },
    normalize: (p) => {
        const out = [];
        for (const seg of p.split("/")) {
            if (seg === "" || seg === ".") continue;
            if (seg === "..") {
                if (out.length && out[out.length - 1] !== "..") out.pop();
                else out.push("..");
            } else out.push(seg);
        }
        return out.join("/");
    },
    join: (a, b) => (a ? `${a}/${b}` : b)
};

// Parses JSON with comments and trailing commas (tsconfig).
function parseJsonc(text) {
    let out = "";
    let i = 0;
    const n = text.length;
    while (i < n) {
        const c = text.charAt(i);
        if (c === '"') {
            let j = i + 1;
            while (j < n && text[j] !== '"') {
                if (text[j] === "\\") j++;
                j++;
            }
            out += text.slice(i, j + 1);
            i = j + 1;
        } else if (c === "/" && text[i + 1] === "/") {
            while (i < n && text[i] !== "\n") i++;
        } else if (c === "/" && text[i + 1] === "*") {
            i += 2;
            while (i < n && !(text[i] === "*" && text[i + 1] === "/")) i++;
            i += 2;
        } else {
            out += c;
            i++;
        }
    }
    return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
}
const safeJson = (text, jsonc = false) => {
    try {
        return jsonc ? parseJsonc(text) : JSON.parse(text);
    } catch {
        return null;
    }
};

/** Directories from the file's folder up to the root. */
const ancestors = (file) => {
    const out = [];
    let d = posix.dirname(file);
    for (;;) {
        out.push(d);
        if (d === "") break;
        d = posix.dirname(d);
    }
    return out;
};

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const num = (m, k) => m.get(k) ?? 0;

export default function run(input) {
    const files = input?.files ?? [];
    const skipDirs = new Set(input?.skipDirNames ?? []);
    const truncated = input?.truncated === true;
    const byPath = new Map(files.map(({ path, text }) => [path, text]));
    const findings = [];
    const lineCache = new Map();
    const add = (f) => {
        if (findings.length < MAX_FINDINGS) findings.push(f);
    };
    const evidenceAt = (file, line) => {
        let lines = lineCache.get(file);
        if (!lines) {
            lines = (byPath.get(file) ?? "").split("\n");
            lineCache.set(file, lines);
        }
        return (lines[line - 1] ?? "").trim().slice(0, 200);
    };

    // ---- package.json / tsconfig ----
    const pkgs = new Map();
    const workspaceNames = new Set();
    const tsPaths = [];
    for (const f of files) {
        const base = f.path.slice(f.path.lastIndexOf("/") + 1);
        const dir = posix.dirname(f.path);
        if (base === "package.json") {
            const j = safeJson(f.text);
            if (!isRecord(j)) continue;
            const deps = new Set();
            for (const k of [
                "dependencies",
                "devDependencies",
                "peerDependencies",
                "optionalDependencies"
            ]) {
                const group = j[k];
                if (isRecord(group)) for (const d of Object.keys(group)) deps.add(d);
            }
            if (typeof j.name === "string") {
                workspaceNames.add(j.name);
                deps.add(j.name);
            }
            pkgs.set(dir, { deps, type: j.type });
        } else if (base === "tsconfig.json" || base === "jsconfig.json") {
            const j = safeJson(f.text, true);
            const co = isRecord(j) ? j.compilerOptions : undefined;
            if (isRecord(co)) {
                const prefixes = isRecord(co.paths)
                    ? Object.keys(co.paths).map((p) => p.replace(/\*.*$/, ""))
                    : [];
                tsPaths.push({
                    dir,
                    prefixes,
                    baseUrl: typeof co.baseUrl === "string" ? co.baseUrl : null
                });
            }
        }
    }
    const declared = (file, name) => {
        const alt = name.startsWith("@")
            ? `@types/${name.slice(1).replace("/", "__")}`
            : `@types/${name}`;
        let any = false;
        for (const d of ancestors(file)) {
            const p = pkgs.get(d);
            if (!p) continue;
            any = true;
            if (p.deps.has(name) || p.deps.has(alt)) return { ok: true, any };
        }
        return { ok: workspaceNames.has(name), any };
    };
    const moduleType = (file) => {
        for (const d of ancestors(file)) {
            const p = pkgs.get(d);
            if (p) return p.type;
        }
        return undefined;
    };
    const isAlias = (spec) => {
        if (
            spec.startsWith("@/") ||
            spec.startsWith("~") ||
            spec.startsWith("#") ||
            spec.startsWith("$")
        )
            return true;
        return tsPaths.some((t) => t.prefixes.some((p) => p && spec.startsWith(p)));
    };

    // ---- Relative path resolution against the snapshot ----
    const hasDirPrefix = (p) => {
        const pre = `${p}/`;
        for (const k of byPath.keys()) if (k.startsWith(pre)) return true;
        return false;
    };
    const resolveFile = (target) => {
        if (byPath.has(target)) return target;
        const ext = /\.[A-Za-z0-9]+$/.exec(target)?.[0] ?? "";
        const stem = ext ? target.slice(0, -ext.length) : target;
        for (const alt of JS_TO_TS[ext] ?? []) if (byPath.has(stem + alt)) return stem + alt;
        for (const e of EXTS) if (byPath.has(target + e)) return target + e;
        for (const e of EXTS) if (byPath.has(`${target}/index${e}`)) return `${target}/index${e}`;
        return null;
    };

    // ---- Analysis ----
    const graph = new Map();
    const sources = files.filter((f) => /\.(?:[cm]?[jt]sx?)$/.test(f.path));
    for (const f of sources) {
        let imports;
        try {
            imports = extractImports(tokenize(f.text));
        } catch {
            continue;
        }
        const edges = [];
        graph.set(f.path, edges);
        const isTs = /\.[cm]?tsx?$/.test(f.path);
        const esmFile =
            f.path.endsWith(".mjs") || (f.path.endsWith(".js") && moduleType(f.path) === "module");

        for (const imp of imports) {
            const spec = imp.spec;
            if (!spec || spec.length > 500) continue;

            if (spec.startsWith("./") || spec.startsWith("../") || spec === "." || spec === "..") {
                const target = posix.normalize(posix.join(posix.dirname(f.path), spec));
                if (target.startsWith("..")) continue; // Outside the snapshot: can't verify
                const ext = ASSET_OR_OTHER.exec(spec)?.[0] ?? "";
                if (ext && !CODE_EXT.test(spec) && !/^\.\.?$/.test(spec)) continue; // Assets (css, svg…): can't verify
                const hit = resolveFile(target);
                if (!hit) {
                    if (target.split("/").some((s) => skipDirs.has(s))) continue; // Generated/skipped dir
                    if (hasDirPrefix(target) && pkgs.has(target)) continue; // Package directory
                    add({
                        rule: "missing-file",
                        severity: "error",
                        file: f.path,
                        line: imp.line,
                        evidence: evidenceAt(f.path, imp.line),
                        message: `Import relatif introuvable : "${spec}" ne correspond à aucun fichier du projet.`,
                        confidence: truncated ? "medium" : "high"
                    });
                    continue;
                }
                if (!imp.typeOnly && imp.kind !== "dynamic")
                    edges.push({ to: hit, line: imp.line });
                // Native ESM requires explicit extensions (no directory -> index).
                if (!isTs && esmFile && imp.kind !== "require" && (!ext || hit !== target)) {
                    add({
                        rule: "esm-extension",
                        severity: "warning",
                        file: f.path,
                        line: imp.line,
                        evidence: evidenceAt(f.path, imp.line),
                        message: `En ESM natif, "${spec}" doit être écrit avec l'extension complète ("${hit.slice(hit.lastIndexOf("/") + 1)}" ou chemin vers index).`,
                        confidence: f.path.endsWith(".mjs") ? "high" : "medium"
                    });
                }
                continue;
            }

            if (spec.startsWith("node:")) {
                if (!BUILTINS.has(spec.slice(5))) {
                    add({
                        rule: "unknown-builtin",
                        severity: "error",
                        file: f.path,
                        line: imp.line,
                        evidence: evidenceAt(f.path, imp.line),
                        message: `Module intégré inconnu : "${spec}".`,
                        confidence: "medium"
                    });
                }
                continue;
            }
            if (/^[a-z][a-z0-9+.-]*:/i.test(spec)) continue; // Other schemes (bun:, npm:, https:, data:, virtual:…)
            if (spec.startsWith("/") || spec.startsWith("\\") || isAlias(spec)) continue;

            const segs = spec.split("/");
            const name = spec.startsWith("@") ? segs.slice(0, 2).join("/") : segs[0];
            if (
                !name ||
                (spec.startsWith("@") && segs.length < 2) ||
                !/^(?:@[a-z0-9~._-]+\/)?[a-z0-9~._-]+$/i.test(name)
            )
                continue;

            if (BUILTINS.has(spec) || BUILTINS.has(name)) {
                if (NODE_ONLY.has(spec) || NODE_ONLY.has(name)) {
                    add({
                        rule: "unknown-builtin",
                        severity: "warning",
                        file: f.path,
                        line: imp.line,
                        evidence: evidenceAt(f.path, imp.line),
                        message: `"${spec}" exige le préfixe "node:" (écris "node:${spec}").`,
                        confidence: "high"
                    });
                }
                continue;
            }
            // With baseUrl, a bare specifier may point to a project file.
            const viaBase = tsPaths.some(
                (t) =>
                    t.baseUrl !== null &&
                    resolveFile(posix.normalize(posix.join(posix.join(t.dir, t.baseUrl), spec)))
            );
            if (viaBase) continue;

            const d = declared(f.path, name);
            if (d.ok) continue;
            add(
                d.any
                    ? {
                          rule: "missing-dependency",
                          severity: "error",
                          file: f.path,
                          line: imp.line,
                          evidence: evidenceAt(f.path, imp.line),
                          message: `"${name}" est importé mais absent de package.json (dependencies, devDependencies, peerDependencies).`,
                          confidence: "high"
                      }
                    : {
                          rule: "no-package-json",
                          severity: "warning",
                          file: f.path,
                          line: imp.line,
                          evidence: evidenceAt(f.path, imp.line),
                          message: `"${name}" ne peut pas être vérifié : aucun package.json trouvé au-dessus de ce fichier.`,
                          confidence: "low"
                      }
            );
        }
    }

    // ---- Cycles (iterative Tarjan SCC, static non-type edges only) ----
    const index = new Map();
    const low = new Map();
    const onStack = new Set();
    const stack = [];
    const sccs = [];
    let counter = 0;
    const visit = (v, work) => {
        index.set(v, counter);
        low.set(v, counter);
        counter++;
        stack.push(v);
        onStack.add(v);
        work.push({ v, i: 0 });
    };
    for (const root of graph.keys()) {
        if (index.has(root)) continue;
        const work = [];
        visit(root, work);
        for (let fr = work.at(-1); fr; fr = work.at(-1)) {
            const edges = graph.get(fr.v) ?? [];
            const edge = edges[fr.i++];
            if (edge) {
                const w = edge.to;
                if (!graph.has(w)) continue;
                if (!index.has(w)) visit(w, work);
                else if (onStack.has(w)) low.set(fr.v, Math.min(num(low, fr.v), num(index, w)));
                continue;
            }
            work.pop();
            const parent = work.at(-1);
            if (parent) low.set(parent.v, Math.min(num(low, parent.v), num(low, fr.v)));
            if (num(low, fr.v) !== num(index, fr.v)) continue;
            const comp = [];
            for (;;) {
                const w = stack.pop();
                if (w === undefined) break;
                onStack.delete(w);
                comp.push(w);
                if (w === fr.v) break;
            }
            if (comp.length > 1 || edges.some((e) => e.to === fr.v)) sccs.push(comp);
        }
    }
    const sorted = sccs.map((c) => c.toSorted(cmp)).toSorted((a, b) => cmp(a[0] ?? "", b[0] ?? ""));
    for (const comp of sorted.slice(0, 50)) {
        const first = comp[0];
        if (first === undefined) continue;
        const members = new Set(comp);
        const edge = (graph.get(first) ?? []).find((e) => members.has(e.to));
        add({
            rule: "import-cycle",
            severity: "warning",
            file: first,
            line: edge ? edge.line : 1,
            evidence: edge ? evidenceAt(first, edge.line) : "",
            message: `Cycle d'imports entre ${comp.length} fichier(s) : ${comp.slice(0, 5).join(" → ")}${comp.length > 5 ? " …" : ""}.`,
            confidence: "medium"
        });
    }
    return { findings };
}
