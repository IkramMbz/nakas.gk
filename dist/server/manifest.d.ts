import type { ManifestOptions } from "./types.js";
/** MUST match `devkit/agents/manifest/run.mjs` (a test enforces it). */
export declare const MANIFEST_SIZES: readonly [32, 48, 72, 128, 180, 192, 256, 384, 512];
export declare const MANIFEST_PREFIXES: readonly ["icon", "maskable-icon"];
/** Exact list of files the agent must return. Anything else rejects the run. */
export declare const ICON_FILES: readonly string[];
export interface ResolvedManifest {
    publicDir: string;
    name: string;
    shortName: string;
    description: string;
    lang: string;
    dir: "ltr" | "rtl" | "auto";
    startUrl: string;
    scope: string;
    display: string;
    orientation: string;
    themeColor: string;
    backgroundColor: string;
    iconsBasePath: string;
}
/** Validates the configuration once; the result only contains checked values. */
export declare function resolveManifest(options: ManifestOptions | undefined, root: string): ResolvedManifest;
/** `manifest.json` content (same shape as the original Python script). */
export declare function buildManifestJson(m: ResolvedManifest): string;
/** `nakas-manifest-yyyy-mm-dd-hh-mm-ss` (local time; sorts chronologically). */
export declare function outputFolderName(date?: Date): string;
//# sourceMappingURL=manifest.d.ts.map