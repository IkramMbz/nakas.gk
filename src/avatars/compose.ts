import { normalizeHex, resolveColors } from "./colors.js";
import { AvatarError } from "./errors.js";
import { pickItem, roll } from "./hash.js";
import type { Avatar, AvatarOptions, Registry } from "./types.js";

/** Builds a deterministic avatar from a registry and seed. */
export function buildAvatar(registry: Registry, seed: string, options: AvatarOptions = {}): Avatar {
    if (typeof seed !== "string")
        throw new AvatarError("INVALID_SEED", "The seed must be a string");
    const { canvas, layers, palettes, parts } = registry;

    const forced = options.parts ?? {};
    for (const key of Object.keys(forced)) {
        if (!layers.some((l) => l.name === key)) {
            throw new AvatarError(
                "UNKNOWN_LAYER",
                `Unknown layer "${key}" (available: ${layers.map((l) => l.name).join(", ")})`
            );
        }
    }
    if (options.size !== undefined && !(options.size > 0 && Number.isFinite(options.size))) {
        throw new AvatarError("INVALID_OPTION", "size must be a strictly positive number");
    }

    const colors = resolveColors(palettes, seed, options.colors);
    const colorize = (markup: string) =>
        markup.replace(/\{\{(\w+)\}\}/g, (_, token: string) => colors[token] ?? "");

    const chosen: Avatar["parts"] = {};
    let body = "";

    for (const layer of layers) {
        const layerParts = parts[layer.name] ?? {};
        const names = Object.keys(layerParts);
        const want = forced[layer.name];
        let name: string | null;

        if (want === null) {
            name = null;
        } else if (want !== undefined) {
            if (!names.includes(want)) {
                throw new AvatarError(
                    names.length ? "UNKNOWN_PART" : "EMPTY_LAYER",
                    `Part "${want}" not found in "${layer.name}" (available: ${names.join(", ") || "none"})`
                );
            }
            name = want;
        } else {
            const probability = layer.probability ?? 100;
            if (names.length === 0) {
                if (probability >= 100) {
                    throw new AvatarError(
                        "EMPTY_LAYER",
                        `The required layer "${layer.name}" contains no SVG`
                    );
                }
                name = null; // empty optional layer: skipped
            } else if (probability < 100 && !roll(seed, `${layer.name}:present`, probability)) {
                name = null;
            } else {
                name = pickItem(seed, `${layer.name}:part`, names);
            }
        }

        chosen[layer.name] = name;
        if (name !== null) {
            const t = layer.transform ? ` transform="${layer.transform}"` : "";
            body += `<g${t}>${colorize(layerParts[name] ?? "")}</g>`;
        }
    }

    const bg = options.background ? normalizeHex(options.background, "background") : null;
    const size = options.size ? ` width="${options.size}" height="${options.size}"` : "";
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.width} ${canvas.height}"` +
        `${size} fill="none" shape-rendering="auto">` +
        (bg ? `<rect width="${canvas.width}" height="${canvas.height}" fill="${bg}"/>` : "") +
        body +
        `</svg>`;

    return {
        svg,
        parts: chosen,
        colors,
        toString: () => svg,
        toDataUri: () => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
    };
}
