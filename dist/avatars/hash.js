/** Computes a deterministic 32-bit non-cryptographic hash. */
export function hash32(input) {
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
}
const NUL = "\u0000";
/** Selects an item using rendezvous hashing to minimize changes when candidates are added or removed. */
export function pickItem(seed, key, items) {
    const first = items[0];
    if (first === undefined)
        throw new RangeError("items must not be empty");
    let best = first;
    let bestScore = -1;
    for (const item of items) {
        const score = hash32(seed + NUL + key + NUL + item);
        if (score > bestScore || (score === bestScore && item < best)) {
            best = item;
            bestScore = score;
        }
    }
    return best;
}
/** Returns whether the seeded roll falls within the given probability (0–100). */
export function roll(seed, key, probability) {
    return hash32(seed + NUL + key) % 100 < probability;
}
//# sourceMappingURL=hash.js.map