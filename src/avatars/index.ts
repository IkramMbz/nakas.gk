import { buildAvatar } from "./compose.js";
import { REGISTRY } from "./registry.generated.js";
import type { Avatar, AvatarOptions } from "./types.js";

/**
 * Generates a deterministic SVG avatar from a seed.
 *
 * @example
 * const avatar = createAvatar("user-123");
 * img.src = avatar.toDataUri();
 */
export function createAvatar(seed: string, options?: AvatarOptions): Avatar {
    return buildAvatar(REGISTRY, seed, options);
}

/** Lists available avatar parts by layer. */
export function listParts(): Record<string, string[]> {
    return Object.fromEntries(
        Object.entries(REGISTRY.parts).map(([layer, p]) => [layer, Object.keys(p)])
    );
}

export { AvatarError } from "./errors.js";
export type { AvatarErrorCode } from "./errors.js";
export type { Avatar, AvatarOptions } from "./types.js";
