/** Computes a deterministic 32-bit non-cryptographic hash. */
export declare function hash32(input: string): number;
/** Selects an item using rendezvous hashing to minimize changes when candidates are added or removed. */
export declare function pickItem(seed: string, key: string, items: readonly string[]): string;
/** Returns whether the seeded roll falls within the given probability (0–100). */
export declare function roll(seed: string, key: string, probability: number): boolean;
//# sourceMappingURL=hash.d.ts.map