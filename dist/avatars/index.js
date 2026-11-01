import { buildAvatar } from "./compose.js";
import { REGISTRY } from "./registry.generated.js";
/**
 * Generates a deterministic SVG avatar from a seed.
 *
 * @example
 * const avatar = createAvatar("user-123");
 * img.src = avatar.toDataUri();
 */
export function createAvatar(seed, options) {
    return buildAvatar(REGISTRY, seed, options);
}
/** Lists available avatar parts by layer. */
export function listParts() {
    return Object.fromEntries(Object.entries(REGISTRY.parts).map(([layer, p]) => [layer, Object.keys(p)]));
}
export { AvatarError } from "./errors.js";
//# sourceMappingURL=index.js.map