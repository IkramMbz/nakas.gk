// Validates SVG part files without external dependencies.
// Checks structure, security, and color tokens.

const FORBIDDEN = [
    [/<\s*script/i, "<script> tag"],
    [/<\s*foreignObject/i, "<foreignObject> tag"],
    [/<\s*image[\s>]/i, "<image> tag (external assets are not allowed)"],
    [/\son[a-z]+\s*=/i, "event handler attribute (onclick, ...)"],
    [/(?:xlink:)?href\s*=/i, "href attribute"],
    [/<!ENTITY|<!DOCTYPE/i, "DOCTYPE/ENTITY"],
    [/\sid\s*=/i, "id attribute (risk of collisions between composed parts)"]
];

/** Validates an SVG part and returns its viewBox and inner markup. */
export function parsePartSvg(text, tokens) {
    const src = text
        .replace(/<\?xml[\s\S]*?\?>/g, "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<metadata[\s\S]*?<\/metadata>/gi, "")
        .trim();
    const m = src.match(/^<svg\b([^>]*)>([\s\S]*)<\/svg>$/);
    if (!m) throw new Error("the file must contain a single <svg>…</svg> root element");

    const viewBox = /\bviewBox="([^"]+)"/.exec(m[1])?.[1];
    if (!viewBox || !/^\s*-?[\d.]+[\s,]+-?[\d.]+[\s,]+[\d.]+[\s,]+[\d.]+\s*$/.test(viewBox)) {
        throw new Error(
            'missing or invalid viewBox on <svg> (expected: viewBox="0 0 width height")'
        );
    }

    const inner = m[2].trim();
    if (!inner) throw new Error("the SVG contains no elements");
    for (const [re, label] of FORBIDDEN)
        if (re.test(inner)) throw new Error(`forbidden content: ${label}`);

    for (const [, name] of inner.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)) {
        if (!tokens.includes(name)) {
            throw new Error(
                `unknown color token {{${name}}} (palettes: ${tokens.join(", ") || "none"})`
            );
        }
    }
    if (/\{\{\s/.test(inner) || /\s\}\}/.test(inner))
        throw new Error("malformed token: write {{name}} without spaces");

    const stack = [];
    for (const [tag, closing, name, selfClose] of [
        ...inner.matchAll(/<(\/?)([A-Za-z][\w:-]*)[^<>]*?(\/?)>/g)
    ].map((t) => [t[0], t[1], t[2], t[3]])) {
        if (selfClose) continue;
        if (!closing) stack.push(name);
        else if (stack.pop() !== name) throw new Error(`unexpected closing tag ${tag}`);
    }
    if (stack.length) throw new Error(`unclosed tag: <${stack.pop()}>`);
    if (inner.replace(/<[^<>]*>/g, "").trim() !== "") throw new Error("stray text in the SVG");

    return { viewBox, inner };
}
