import type { AvatarOptions } from "./types.js";
/** Normalizes a hex color to lowercase #rrggbb format. */
export declare function normalizeHex(value: unknown, context: string): string;
/** Resolves each color from an override, custom palette, or default palette. */
export declare function resolveColors(palettes: Record<string, string[]>, seed: string, overrides?: NonNullable<AvatarOptions["colors"]>): Record<string, string>;
//# sourceMappingURL=colors.d.ts.map