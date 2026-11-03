// Transform agents (`read: file`): the PARENT reads ONE file and writes the result.
// The agent is a pure function (bytes in, bytes out) running in the usual sandbox:
// no write, no addon, no network, no child process.
import { DevkitError } from "./errors.mjs";
import { loadAgent } from "./agent.mjs";
import { readFileConfined } from "./paths.mjs";
import { LIMITS } from "./policy.mjs";
import { DEFAULT_ROOT } from "./runner.mjs";
import { runSandboxed } from "./sandbox.mjs";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ICO_HEADER = Buffer.from([0, 0, 1, 0]);
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const MAX_ICON_SIDE = 4096;

/** Refuses an image that is not a PNG or is too large BEFORE any decoding. */
function assertPngWithinLimits(buf) {
    if (buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
        throw new DevkitError("E_POLICY", "fichier refusé : ce n'est pas un PNG");
    }
    if (buf.toString("latin1", 12, 16) !== "IHDR") {
        throw new DevkitError("E_POLICY", "PNG invalide : IHDR absent");
    }
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    if (
        width < 1 ||
        height < 1 ||
        width > LIMITS.maxImageSide ||
        height > LIMITS.maxImageSide ||
        width * height > LIMITS.maxImagePixels
    ) {
        throw new DevkitError(
            "E_POLICY",
            `image trop grande (max ${LIMITS.maxImageSide} px par côté, ${LIMITS.maxImagePixels / 1e6} mégapixels)`
        );
    }
}

/**
 * Rebuilds the result: the agent can only return the files the caller expects,
 * all of them, with the right format. Anything else = the whole run is rejected.
 */
const bad = (why) => {
    throw new DevkitError("E_OUTPUT", `résultat de l'agent refusé : ${why}`);
};

function validateArtifacts(raw, expected) {
    if (!Array.isArray(raw)) bad("liste attendue");
    if (raw.length > LIMITS.maxArtifacts) bad("trop de fichiers");
    const wanted = new Set(expected);
    const seen = new Set();
    const out = [];
    let total = 0;
    for (const item of raw) {
        if (
            item === null ||
            typeof item !== "object" ||
            Array.isArray(item) ||
            Object.keys(item).some((k) => k !== "name" && k !== "base64")
        ) {
            bad("entrée mal formée");
        }
        const { name, base64 } = item;
        if (typeof name !== "string" || !wanted.has(name)) bad("fichier inattendu");
        if (seen.has(name)) bad("fichier en double");
        if (
            typeof base64 !== "string" ||
            base64.length > LIMITS.maxArtifactBytes * 2 ||
            !BASE64.test(base64)
        ) {
            bad("contenu invalide");
        }
        const data = Buffer.from(base64, "base64");
        if (data.length === 0 || data.length > LIMITS.maxArtifactBytes) bad("taille invalide");
        total += data.length;
        if (total > LIMITS.maxArtifactsTotalBytes) bad("volume total trop grand");

        if (name.endsWith(".png")) {
            if (!data.subarray(0, 8).equals(PNG_SIGNATURE) || data.length < 33) bad("PNG invalide");
            if (data.readUInt32BE(16) > MAX_ICON_SIDE || data.readUInt32BE(20) > MAX_ICON_SIDE) {
                bad("dimensions excessives");
            }
        } else if (name.endsWith(".ico")) {
            if (!data.subarray(0, 4).equals(ICO_HEADER)) bad("ICO invalide");
        } else {
            bad("extension non prévue");
        }
        seen.add(name);
        out.push({ name, data });
    }
    for (const name of wanted) if (!seen.has(name)) bad(`fichier manquant (${name})`);
    return out;
}

/**
 * Runs a locked `read: file` agent on ONE file found directly in `dir`.
 * `expected`: exact list of file names the agent must return.
 */
export async function runTransform({
    name,
    dir,
    file,
    expected,
    params = {},
    root = DEFAULT_ROOT,
    strict = false,
    timeoutMs
} = {}) {
    const t0 = Date.now();
    if (!Array.isArray(expected) || expected.length === 0) {
        throw new DevkitError("E_USAGE", "liste des fichiers attendus manquante");
    }
    const agent = await loadAgent(root, name, { requireLock: true });
    if (agent.permissions.read !== "file") {
        throw new DevkitError(
            "E_USAGE",
            `agent "${name}" : ce n'est pas un agent de transformation`
        );
    }
    const buf = await readFileConfined(dir, file, { maxBytes: LIMITS.maxImageBytes });
    assertPngWithinLimits(buf);

    const { artifacts, isolation } = await runSandboxed({
        entries: agent.entries,
        scriptRel: agent.script,
        input: {
            schema: "devkit.input/2",
            file: { name: file, base64: buf.toString("base64") },
            params
        },
        strict,
        timeoutMs: timeoutMs ?? LIMITS.timeoutMs,
        maxOutputBytes: LIMITS.maxTransformOutputBytes
    });

    return {
        schema: "devkit.transform/1",
        agent: { name: agent.name, sha256: agent.sha256 },
        isolation,
        artifacts: validateArtifacts(artifacts, expected),
        durationMs: Date.now() - t0
    };
}
