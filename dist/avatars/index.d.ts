import type { Avatar, AvatarOptions } from "./types.js";
/**
 * Generates a deterministic SVG avatar from a seed.
 *
 * @example
 * const avatar = createAvatar("user-123");
 * img.src = avatar.toDataUri();
 */
export declare function createAvatar(seed: string, options?: AvatarOptions): Avatar;
/** Lists available avatar parts by layer. */
export declare function listParts(): Record<string, string[]>;
export { AvatarError } from "./errors.js";
export type { AvatarErrorCode } from "./errors.js";
export type { Avatar, AvatarOptions } from "./types.js";
//# sourceMappingURL=index.d.ts.map