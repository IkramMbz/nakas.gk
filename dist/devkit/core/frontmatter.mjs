// Deliberately tiny YAML subset: `key: value` and a single
// nesting level (permissions, indented 2 to 4 spaces: Markdown formatters rewrite
// indentation, so the parser must not depend on it). Everything else is rejected: no anchors,
// no tags, no lists, no multiline => no parsing surface.
import { DevkitError } from "./errors.mjs";
import { PERMISSION_CEILING } from "./policy.mjs";

const TOP = new Set(["name", "description", "script", "permissions"]);
const PERM_KEYS = new Set(Object.keys(PERMISSION_CEILING));
const unquote = (v) => (/^(["']).*\1$/.test(v) && v.length >= 2 ? v.slice(1, -1) : v);
const fail = (m) => {
    throw new DevkitError("E_POLICY", `SKILL.md : ${m}`);
};

export function parseSkill(buf, expectedName) {
    if (buf.length > 64 << 10) fail("trop gros");
    const text = buf.toString("utf8").replace(/\r\n/g, "\n");
    if (!text.startsWith("---\n")) fail("en-tête --- manquant");
    const end = text.indexOf("\n---", 4);
    if (end === -1) fail("en-tête non fermé");
    const lines = text.slice(4, end).split("\n");

    const meta = {};
    const perms = {};
    let inPerms = false;
    for (const line of lines) {
        if (line.trim() === "") continue;
        if (line.includes("\t")) fail("tabulation interdite");
        const m = /^( {2,4})?([a-z]+):\s*(.*)$/.exec(line);
        if (!m) fail(`ligne illisible : ${JSON.stringify(line.slice(0, 60))}`);
        const [, indent, key, rawVal] = m;
        const indented = indent !== undefined;
        const val = unquote(rawVal.trim());
        if (!indented) {
            inPerms = false;
            if (!TOP.has(key)) fail(`clé inconnue "${key}"`);
            if (Object.hasOwn(meta, key)) fail(`clé dupliquée "${key}"`);
            if (key === "permissions") {
                if (val !== "") fail("permissions doit être un bloc");
                meta.permissions = perms;
                inPerms = true;
            } else {
                meta[key] = val;
            }
        } else {
            if (!inPerms) fail("indentation inattendue");
            if (!PERM_KEYS.has(key)) fail(`permission inconnue "${key}"`);
            if (Object.hasOwn(perms, key)) fail(`permission dupliquée "${key}"`);
            perms[key] = val;
        }
    }

    if (meta.name !== expectedName) fail("name doit être identique au nom du dossier");
    if (
        typeof meta.description !== "string" ||
        meta.description.length === 0 ||
        meta.description.length > 300
    ) {
        fail("description requise (≤ 300 caractères)");
    }
    if (typeof meta.script !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*\.mjs$/.test(meta.script)) {
        fail("script doit être un nom de fichier .mjs simple, sans dossier");
    }
    if (!meta.permissions) fail('bloc permissions requis (même "none" partout)');
    const permissions = {};
    for (const [k, allowed] of Object.entries(PERMISSION_CEILING)) {
        const v = perms[k];
        if (v === undefined) fail(`permission "${k}" à déclarer explicitement`);
        // Ceiling: declaring more than the runner grants => hard refusal, no silent downgrade.
        if (!allowed.includes(v))
            fail(
                `permission ${k}: ${v} non accordée par le runner (permis : ${allowed.join("|")})`
            );
        permissions[k] = v;
    }
    return { name: meta.name, description: meta.description, script: meta.script, permissions };
}
