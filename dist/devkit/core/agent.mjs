import path from "node:path";
import fs from "node:fs/promises";
import { DevkitError } from "./errors.mjs";
import { assertAgentName } from "./paths.mjs";
import { readAgentTree, hashEntries, loadLock } from "./lock.mjs";
import { parseSkill } from "./frontmatter.mjs";
import { lintAgent } from "./lint.mjs";

// Loads an agent: tree -> manifest -> lint -> (optional) fingerprint vs agents.lock.
export async function loadAgent(root, name, { requireLock = true } = {}) {
    assertAgentName(name);
    const dir = path.join(root, "agents", name);
    let st;
    try {
        st = await fs.lstat(dir);
    } catch {
        throw new DevkitError("E_USAGE", `agent inconnu : ${name}`);
    }
    if (!st.isDirectory())
        throw new DevkitError("E_POLICY", "agent : doit être un vrai dossier (pas de lien)");

    const entries = await readAgentTree(dir);
    const sha256 = hashEntries(entries);
    if (requireLock) {
        const lock = await loadLock(root);
        if (!lock.has(name))
            throw new DevkitError(
                "E_LOCK",
                `agent "${name}" absent de agents.lock — refus d'exécuter`
            );
        if (lock.get(name) !== sha256) {
            throw new DevkitError(
                "E_LOCK",
                `agent "${name}" modifié depuis agents.lock — refus d'exécuter (relis le diff puis : devkit lock)`
            );
        }
    }
    const skill = entries.find((e) => e.rel === "SKILL.md");
    if (!skill) throw new DevkitError("E_POLICY", "agent : SKILL.md manquant");
    const manifest = parseSkill(skill.buf, name);
    if (!entries.some((e) => e.rel === manifest.script))
        throw new DevkitError("E_POLICY", "agent : script déclaré introuvable");
    lintAgent(entries);
    return { name, sha256, entries, ...manifest };
}
