import { AvatarError } from "./errors.js";
import { pickItem } from "./hash.js";
import type { AvatarOptions } from "./types.js";

/** Normalizes a hex color to lowercase #rrggbb format. */
export function normalizeHex(value: unknown, context: string): string {
    if (typeof value === "string") {
        const h = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(value.trim())?.[1]?.toLowerCase();
        if (h) return "#" + (h.length === 3 ? h.replace(/./g, "$&$&") : h);
    }
    throw new AvatarError(
        "INVALID_COLOR",
        `${context}: invalid color ${JSON.stringify(value)} (expected #rgb or #rrggbb)`
    );
}

/** Resolves each color from an override, custom palette, or default palette. */
export function resolveColors(
    palettes: Record<string, string[]>,
    seed: string,
    overrides: NonNullable<AvatarOptions["colors"]> = {}
): Record<string, string> {
    for (const key of Object.keys(overrides)) {
        if (!(key in palettes)) {
            throw new AvatarError(
                "UNKNOWN_COLOR",
                `Unknown color token "${key}" (available: ${Object.keys(palettes).join(", ")})`
            );
        }
    }

    const out: Record<string, string> = {};
    for (const [token, defaults] of Object.entries(palettes)) {
        const o = overrides[token];
        if (typeof o === "string") {
            out[token] = normalizeHex(o, `colors.${token}`);
            continue;
        }
        const palette = o === undefined ? defaults : o;
        if (!Array.isArray(palette) || palette.length === 0) {
            throw new AvatarError(
                "EMPTY_PALETTE",
                `colors.${token}: the palette must contain at least one color`
            );
        }
        const list =
            o === undefined ? palette : palette.map((c) => normalizeHex(c, `colors.${token}`));
        out[token] = pickItem(seed, `color:${token}`, list);
    }
    return out;
}
