import path from "node:path";
import { DevkitError } from "../devkit/core/index.mjs";
/** MUST match `devkit/agents/manifest/run.mjs` (a test enforces it). */
export const MANIFEST_SIZES = [32, 48, 72, 128, 180, 192, 256, 384, 512];
export const MANIFEST_PREFIXES = ["icon", "maskable-icon"];
/** Exact list of files the agent must return. Anything else rejects the run. */
export const ICON_FILES = [
    ...MANIFEST_SIZES.flatMap((size) => MANIFEST_PREFIXES.map((prefix) => `manifest/${prefix}-${size}x${size}.png`)),
    "logo.png",
    "logo_git.png",
    "apple-touch-icon.png",
    "favicon.ico"
];
const DISPLAYS = ["standalone", "fullscreen", "minimal-ui", "browser"];
const ORIENTATIONS = [
    "any",
    "natural",
    "landscape",
    "portrait",
    "portrait-primary",
    "portrait-secondary",
    "landscape-primary",
    "landscape-secondary"
];
const DIRS = ["ltr", "rtl", "auto"];
const COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const LANG = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,3}$/;
const URL_PATH = /^\/[A-Za-z0-9/_.~%-]*$/;
const ICON_PATH = /^\/(?:[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*)?$/;
// eslint-disable-next-line no-control-regex
const INVISIBLE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g;
const bad = (field) => {
    throw new DevkitError("E_USAGE", `manifest.${field} invalide`);
};
function text(value, field, fallback, max) {
    if (value === undefined)
        return fallback;
    const clean = value.replace(INVISIBLE, "").trim();
    return clean.length > max ? bad(field) : clean;
}
function matching(value, field, fallback, re) {
    if (value === undefined)
        return fallback;
    return re.test(value) ? value : bad(field);
}
function oneOf(value, field, fallback, list) {
    if (value === undefined)
        return fallback;
    return list.find((item) => item === value) ?? bad(field);
}
/** Validates the configuration once; the result only contains checked values. */
export function resolveManifest(options, root) {
    const o = options ?? {};
    const projectName = path.basename(root) || "app";
    const name = text(o.name, "name", projectName, 100) || projectName;
    const iconsBasePath = o.iconsBasePath === undefined ? "/manifest" : o.iconsBasePath;
    if (!ICON_PATH.test(iconsBasePath) || iconsBasePath.includes("..") || iconsBasePath.includes("//")) {
        bad("iconsBasePath");
    }
    return {
        publicDir: o.publicDir ?? "public",
        name,
        shortName: text(o.shortName, "shortName", name, 30) || name,
        description: text(o.description, "description", "", 300),
        lang: matching(o.lang, "lang", "fr-FR", LANG),
        dir: oneOf(o.dir, "dir", "ltr", DIRS),
        startUrl: matching(o.startUrl, "startUrl", "/", URL_PATH),
        scope: matching(o.scope, "scope", "/", URL_PATH),
        display: oneOf(o.display, "display", "standalone", DISPLAYS),
        orientation: oneOf(o.orientation, "orientation", "portrait-primary", ORIENTATIONS),
        themeColor: matching(o.themeColor, "themeColor", "#ffffff", COLOR),
        backgroundColor: matching(o.backgroundColor, "backgroundColor", "#ffffff", COLOR),
        iconsBasePath: iconsBasePath.replace(/\/$/, "")
    };
}
/** `manifest.json` content (same shape as the original Python script). */
export function buildManifestJson(m) {
    const icons = MANIFEST_SIZES.flatMap((size) => {
        const sizes = `${size}x${size}`;
        return [
            { src: `${m.iconsBasePath}/icon-${sizes}.png`, sizes, type: "image/png", purpose: "any" },
            {
                src: `${m.iconsBasePath}/maskable-icon-${sizes}.png`,
                sizes,
                type: "image/png",
                purpose: "maskable"
            }
        ];
    });
    return `${JSON.stringify({
        name: m.name,
        short_name: m.shortName,
        description: m.description,
        lang: m.lang,
        dir: m.dir,
        start_url: m.startUrl,
        scope: m.scope,
        display: m.display,
        orientation: m.orientation,
        theme_color: m.themeColor,
        background_color: m.backgroundColor,
        icons,
        categories: []
    }, null, 4)}\n`;
}
const pad = (n) => String(n).padStart(2, "0");
/** `nakas-manifest-yyyy-mm-dd-hh-mm-ss` (local time; sorts chronologically). */
export function outputFolderName(date = new Date()) {
    return (`nakas-manifest-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `-${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`);
}
//# sourceMappingURL=manifest.js.map