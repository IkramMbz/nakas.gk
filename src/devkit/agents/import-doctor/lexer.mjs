// Minimal JS/TS lexer: extracts imports while ignoring comments, strings,
// template literals, and regular expressions. Linear-time and bounded.
const REGEX_AFTER_WORD = new Set([
    "return",
    "typeof",
    "instanceof",
    "in",
    "of",
    "new",
    "delete",
    "void",
    "throw",
    "case",
    "do",
    "else",
    "yield",
    "await"
]);
const ID_START = /[A-Za-z_$\u0080-\uffff]/;
const ID_PART = /[A-Za-z0-9_$\u0080-\uffff]/;

export function tokenize(src, maxTokens = 500_000) {
    const toks = [];
    const n = src.length;
    const braces = [];
    let i = 0;
    let line = 1;
    const push = (t, v, l) => {
        if (toks.length >= maxTokens) throw new RangeError("fichier trop dense");
        toks.push({ t, v, line: l });
    };

    // Read a template literal chunk until ` (end) or ${ (resume code parsing).
    const templateChunk = () => {
        const from = i;
        while (i < n) {
            const c = src[i];
            if (c === "\\") {
                if (src[i + 1] === "\n") line++;
                i += 2;
                continue;
            }
            if (c === "\n") line++;
            if (c === "`") {
                const v = src.slice(from, i);
                i++;
                return { end: true, v };
            }
            if (c === "$" && src[i + 1] === "{") {
                braces.push("tpl");
                i += 2;
                return { end: false, v: src.slice(from, i - 2) };
            }
            i++;
        }
        return { end: true, v: src.slice(from) };
    };

    if (src.startsWith("#!")) {
        while (i < n && src[i] !== "\n") i++;
    }

    while (i < n) {
        const c = src.charAt(i);
        if (c === "\n") {
            line++;
            i++;
            continue;
        }
        if (c === " " || c === "\t" || c === "\r" || c === "\f" || c === "\v") {
            i++;
            continue;
        }

        if (c === "/" && src[i + 1] === "/") {
            while (i < n && src[i] !== "\n") i++;
            continue;
        }
        if (c === "/" && src[i + 1] === "*") {
            i += 2;
            while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
                if (src[i] === "\n") line++;
                i++;
            }
            i += 2;
            continue;
        }

        if (c === '"' || c === "'") {
            const q = c;
            const l = line;
            const from = ++i;
            while (i < n && src[i] !== q && src[i] !== "\n") {
                if (src[i] === "\\") i++;
                i++;
            }
            push("str", src.slice(from, i), l);
            if (src[i] === q) i++;
            continue;
        }

        if (c === "`") {
            const l = line;
            i++;
            const chunk = templateChunk();

            // Template without interpolation = string usable as a module specifier.
            push(chunk.end ? "str" : "tpl", chunk.end ? chunk.v : "", l);
            continue;
        }

        if (c === "{") {
            braces.push("{");
            push("p", "{", line);
            i++;
            continue;
        }
        if (c === "}") {
            const top = braces.pop();
            if (top === "tpl") {
                const l = line;
                i++;
                const chunk = templateChunk();
                if (chunk.end) push("tpl", "", l);
                continue;
            }
            push("p", "}", line);
            i++;
            continue;
        }

        if (c === "/") {
            const prev = toks[toks.length - 1];
            const regexOk =
                !prev ||
                (prev.t === "p" && prev.v !== ")" && prev.v !== "]" && prev.v !== "}") ||
                (prev.t === "id" && REGEX_AFTER_WORD.has(prev.v));
            if (regexOk) {
                let j = i + 1;
                let inClass = false;
                let ok = false;
                while (j < n && src[j] !== "\n") {
                    const d = src[j];
                    if (d === "\\") {
                        j += 2;
                        continue;
                    }
                    if (d === "[") inClass = true;
                    else if (d === "]") inClass = false;
                    else if (d === "/" && !inClass) {
                        ok = true;
                        break;
                    }
                    j++;
                }
                if (ok) {
                    j++;
                    while (j < n && ID_PART.test(src.charAt(j))) j++;
                    push("rx", "", line);
                    i = j;
                    continue;
                }
            }
            push("p", "/", line);
            i++;
            continue;
        }

        if (ID_START.test(c)) {
            const from = i++;
            while (i < n && ID_PART.test(src.charAt(i))) i++;
            push("id", src.slice(from, i), line);
            continue;
        }
        if (c >= "0" && c <= "9") {
            const from = i++;
            while (i < n && /[0-9A-Za-z_.]/.test(src.charAt(i))) i++;
            push("num", src.slice(from, i), line);
            continue;
        }
        push("p", c, line);
        i++;
    }
    return toks;
}

const isP = (t, v) => t !== undefined && t.t === "p" && t.v === v;
const STOP_WORDS = new Set([
    "function",
    "class",
    "const",
    "let",
    "var",
    "default",
    "async",
    "interface",
    "enum",
    "namespace",
    "declare",
    "abstract",
    "import",
    "export"
]);

export function extractImports(toks) {
    const out = [];
    const LOOKAHEAD = 2000;
    for (let k = 0; k < toks.length; k++) {
        const t = toks[k];
        if (!t || t.t !== "id" || isP(toks[k - 1], ".")) continue;

        if (t.v === "import") {
            const a = toks[k + 1];
            if (!a) continue;
            if (a.t === "str") {
                out.push({ spec: a.v, line: a.line, kind: "import", typeOnly: false });
                continue;
            }
            if (isP(a, "(")) {
                const s = toks[k + 2];
                const c = toks[k + 3];
                if (s && s.t === "str" && (isP(c, ")") || isP(c, ",")))
                    out.push({ spec: s.v, line: s.line, kind: "dynamic", typeOnly: false });
                continue;
            }
            if (isP(a, ".")) continue; // import.meta
            let typeOnly = false;
            if (a.t === "id" && a.v === "type") {
                const b = toks[k + 2];
                typeOnly =
                    b !== undefined &&
                    (isP(b, "{") || isP(b, "*") || (b.t === "id" && b.v !== "from"));
            }
            for (let j = k + 1; j < Math.min(toks.length, k + LOOKAHEAD); j++) {
                const u = toks[j];
                if (!u || isP(u, ";") || (u.t === "id" && (u.v === "import" || u.v === "export")))
                    break;
                const next = toks[j + 1];
                if (u.t === "id" && u.v === "from" && next?.t === "str") {
                    out.push({ spec: next.v, line: next.line, kind: "import", typeOnly });
                    k = j + 1;
                    break;
                }
            }
            continue;
        }

        if (t.v === "export") {
            let depth = 0;
            let typeOnly = false;
            const a = toks[k + 1];
            if (a && a.t === "id" && a.v === "type") {
                const b = toks[k + 2];
                typeOnly = isP(b, "{") || isP(b, "*");
            }
            for (let j = k + 1; j < Math.min(toks.length, k + LOOKAHEAD); j++) {
                const u = toks[j];
                if (!u) break;
                const next = toks[j + 1];
                if (isP(u, "{")) depth++;
                else if (isP(u, "}")) depth--;
                else if (
                    depth <= 0 &&
                    (isP(u, ";") || isP(u, "=") || (u.t === "id" && STOP_WORDS.has(u.v)))
                )
                    break;
                else if (depth <= 0 && u.t === "id" && u.v === "from" && next?.t === "str") {
                    out.push({ spec: next.v, line: next.line, kind: "export", typeOnly });
                    k = j + 1;
                    break;
                }
            }
            continue;
        }

        const arg = toks[k + 2];
        if (
            t.v === "require" &&
            isP(toks[k + 1], "(") &&
            arg?.t === "str" &&
            isP(toks[k + 3], ")")
        ) {
            out.push({ spec: arg.v, line: arg.line, kind: "require", typeOnly: false });
        }
    }
    return out;
}
