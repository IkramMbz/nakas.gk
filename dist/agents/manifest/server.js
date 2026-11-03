import { DevkitError, listConfinedFiles, resolveConfinedDir, runTransform, writeArtifactsExclusive } from "../../devkit/core/index.mjs";
import { buildManifestJson, ICON_FILES, outputFolderName, resolveManifest } from "../../server/manifest.js";
/** Folder name of the locked agent in `devkit/agents/`. */
export const ICON_AGENT = "manifest";
const IMAGE_EXTS = [".png"];
/** `GET /alfred`: source images + session token (only when this page may write). */
export const alfredTool = async ({ root, options, token }) => {
    const manifest = resolveManifest(options.manifest, root);
    const summary = {
        name: manifest.name,
        shortName: manifest.shortName,
        iconsBasePath: manifest.iconsBasePath
    };
    const status = { canWrite: token !== undefined, token: token ?? null, manifest: summary };
    try {
        const dir = await resolveConfinedDir(root, manifest.publicDir);
        const images = await listConfinedFiles(dir, { exts: IMAGE_EXTS });
        return { dir: manifest.publicDir, exists: true, problem: null, images, ...status };
    }
    catch (e) {
        if (!(e instanceof DevkitError))
            throw e;
        return {
            dir: manifest.publicDir,
            exists: false,
            problem: e.message,
            images: [],
            ...status
        };
    }
};
const usage = (message) => {
    throw new DevkitError("E_USAGE", message);
};
function parseBody(body) {
    if (typeof body !== "object" || body === null || Array.isArray(body))
        return usage("corps invalide");
    const fields = new Map(Object.entries(body));
    if ([...fields.keys()].some((k) => k !== "file" && k !== "center"))
        return usage("champ inconnu");
    const file = fields.get("file");
    if (typeof file !== "string" || file.length === 0 || file.length > 200)
        return usage("image invalide");
    const center = fields.get("center") ?? true;
    if (typeof center !== "boolean")
        return usage("« center » doit être un booléen");
    return { file, center };
}
/**
 * `POST /alfred`: runs `icon-forge` on ONE image of the source folder and writes the result
 * in a NEW `nakas-manifest-<date>` folder. The request carries only an image name, checked
 * against the server's own listing; paths, folder name and options never come from it.
 */
export const alfredWriteTool = async ({ root, options, body }) => {
    const input = parseBody(body);
    const manifest = resolveManifest(options.manifest, root);
    const dir = await resolveConfinedDir(root, manifest.publicDir);
    const images = await listConfinedFiles(dir, { exts: IMAGE_EXTS });
    if (!images.some((image) => image.name === input.file)) {
        throw new DevkitError("E_USAGE", "image introuvable dans le dossier source");
    }
    const result = await runTransform({
        name: ICON_AGENT,
        dir,
        file: input.file,
        expected: ICON_FILES,
        params: { center: input.center },
        strict: options.strict === true
    });
    const written = await writeArtifactsExclusive({
        parentDir: dir,
        folderName: outputFolderName(),
        files: [
            ...result.artifacts,
            { name: "manifest.json", data: Buffer.from(buildManifestJson(manifest), "utf8") }
        ]
    });
    return {
        ok: true,
        folder: `${manifest.publicDir}/${written.folder}`,
        files: written.files,
        durationMs: result.durationMs,
        isolation: result.isolation.network
    };
};
//# sourceMappingURL=server.js.map