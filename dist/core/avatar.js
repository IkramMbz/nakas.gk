import { createAvatar } from "../avatars/index.js";
const cache = new WeakMap();
/** A Nakas avatar (data URI): computed once, deterministic. */
export function avatarSrc(nakas, index) {
    const hit = cache.get(nakas);
    if (hit)
        return hit;
    const { hair, mouth, skin, hairColor, background } = nakas.appearance;
    const src = createAvatar(`team-${nakas.id}-${String(index + 1).padStart(2, "0")}`, {
        parts: { hair, accessories: null, ...(mouth ? { mouth } : {}) },
        colors: { skin, hair: [hairColor] },
        background,
        size: 96
    }).toDataUri();
    cache.set(nakas, src);
    return src;
}
//# sourceMappingURL=avatar.js.map