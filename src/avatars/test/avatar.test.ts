import { describe, expect, it } from "vitest";
import { createAvatar, listParts, AvatarError } from "../index.js";
import { hash32, pickItem } from "../hash.js";
import { parsePartSvg } from "../scripts/svg-check.mjs";

const SEEDS = Array.from({ length: 300 }, (_, i) => `user-${i}`);

const errorCode = (fn: () => unknown) => {
    try {
        fn();
    } catch (e) {
        if (e instanceof AvatarError) return e.code;
        throw e;
    }
    throw new Error("no error thrown");
};

describe("determinism", () => {
    it("same seed, same avatar", () => {
        for (const s of SEEDS.slice(0, 50)) {
            expect(createAvatar(s).svg).toBe(createAvatar(s).svg);
        }
    });

    it("the hash is stable (reference values independent of the environment)", () => {
        expect(hash32("user-123")).toBe(3035771780);
        expect(hash32("é😀")).toBe(hash32("é😀"));
    });

    it("the selection algorithm is frozen (independent of the SVG assets)", () => {
        // Adding or removing an SVG legitimately changes some avatars (rendezvous hashing),
        // so the drift detector uses a fixed candidate list instead of the registry.
        expect(pickItem("user-123", "hair:part", ["a", "b", "c", "d", "e", "f", "g", "h"])).toBe(
            "d"
        );
        expect(pickItem("user-123", "color:hair", ["#000", "#111", "#222"])).toBe("#000");
    });

    it("adding a part only changes the avatars that pick the new part", () => {
        const names = ["bangs", "mohawk", "braids", "short-hair"];
        const grown = [...names, "brand-new"];
        const changed = SEEDS.filter(
            (s) => pickItem(s, "hair:part", names) !== pickItem(s, "hair:part", grown)
        );
        for (const s of changed) expect(pickItem(s, "hair:part", grown)).toBe("brand-new");
        expect(changed.length).toBeGreaterThan(0);
        expect(changed.length).toBeLessThan(SEEDS.length / 2);
    });

    it("different seeds give different avatars", () => {
        const unique = new Set(SEEDS.map((s) => createAvatar(s).svg));
        expect(unique.size).toBeGreaterThan(280);
    });

    it("every available part is reached with enough seeds", () => {
        const seen: Record<string, Set<string | null>> = {};
        for (const s of SEEDS) {
            for (const [k, v] of Object.entries(createAvatar(s).parts))
                (seen[k] ??= new Set()).add(v);
        }
        for (const [layer, names] of Object.entries(listParts())) {
            for (const n of names) expect(seen[layer]?.has(n), `${layer}/${n}`).toBe(true);
        }
    });

    it("the accessories layer is optional (~50%)", () => {
        const withAcc = SEEDS.filter((s) => createAvatar(s).parts.accessories !== null).length;
        expect(withAcc).toBeGreaterThan(100);
        expect(withAcc).toBeLessThan(200);
    });
});

describe("composition", () => {
    it("produces a well-formed SVG with no leftover tokens", () => {
        for (const s of SEEDS.slice(0, 100)) {
            const { svg } = createAvatar(s);
            expect(() => parsePartSvg(svg, [])).not.toThrow();
            expect(svg).not.toContain("{{");
            expect(
                svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480"')
            ).toBe(true);
        }
    });

    it("stacks layers in manifest order (head before hair)", () => {
        const { svg } = createAvatar("order", { parts: { accessories: "glasses" } });
        const idx = (t: string) => svg.indexOf(t);
        expect(idx("matrix(.85682")).toBeGreaterThan(-1); // head
        expect(idx("matrix(.85682")).toBeLessThan(idx("matrix(.85472 0 0 .85667 1.8")); // hair
        expect(idx("matrix(.85472 0 0 .85667 1.8")).toBeLessThan(
            idx("matrix(.85472 0 0 .85667 85.6")
        ); // accessories
    });

    it("applies colors to tokens only", () => {
        const a = createAvatar("c", {
            colors: { hair: "#ff0000", skin: "#00ff00" },
            parts: { hair: "bangs" }
        });
        expect(a.colors).toEqual({ hair: "#ff0000", skin: "#00ff00" });
        expect(a.svg).toContain('fill="#ff0000"');
        expect(a.svg).toContain('fill="#00ff00"');
        expect(a.svg).toContain('fill="white"'); // fixed colors (teeth) are untouched
    });

    it("toDataUri is decodable", () => {
        const a = createAvatar("uri");
        expect(decodeURIComponent(a.toDataUri().replace("data:image/svg+xml;utf8,", ""))).toBe(
            a.svg
        );
        expect(String(a)).toBe(a.svg);
    });
});

describe("options", () => {
    it("parts: forces a part, null removes a layer", () => {
        const a = createAvatar("o", { parts: { hair: "mohawk", accessories: null } });
        expect(a.parts.hair).toBe("mohawk");
        expect(a.parts.accessories).toBeNull();
    });

    it("forcing a part does not change the other choices", () => {
        const base = createAvatar("stable");
        const forced = createAvatar("stable", { parts: { hair: "mohawk" } });
        expect({ ...forced.parts, hair: base.parts.hair }).toEqual(base.parts);
        expect(forced.colors).toEqual(base.colors);
    });

    it("colors: a custom palette is respected, #abc is normalized", () => {
        for (const s of SEEDS.slice(0, 20)) {
            expect(["#000000", "#ffffff"]).toContain(
                createAvatar(s, { colors: { hair: ["#000", "FFFFFF"] } }).colors.hair
            );
        }
    });

    it("background and size", () => {
        const a = createAvatar("b", { background: "E6E6E6", size: 64 });
        expect(a.svg).toContain('<rect width="480" height="480" fill="#e6e6e6"/>');
        expect(a.svg).toContain('width="64" height="64"');
        expect(createAvatar("b").svg).not.toContain('<rect width="480"');
        expect(createAvatar("b", { background: null }).svg).not.toContain('<rect width="480"');
    });
});

describe("edge cases", () => {
    it.each(["", " ", "😀🎉", "é".repeat(10_000), "a\u0000b", "\n"])("seed %j", (s: string) => {
        const a = createAvatar(s);
        expect(a.svg.startsWith("<svg")).toBe(true);
        expect(createAvatar(s).svg).toBe(a.svg);
    });

    it("explicit errors", () => {
        // @ts-expect-error intentionally invalid seed
        expect(errorCode(() => createAvatar(42))).toBe("INVALID_SEED");
        expect(errorCode(() => createAvatar("a", { parts: { cape: "x" } }))).toBe("UNKNOWN_LAYER");
        expect(errorCode(() => createAvatar("a", { parts: { hair: "nope" } }))).toBe(
            "UNKNOWN_PART"
        );
        expect(errorCode(() => createAvatar("a", { colors: { eyes: "#000" } }))).toBe(
            "UNKNOWN_COLOR"
        );
        expect(errorCode(() => createAvatar("a", { colors: { hair: "rouge" } }))).toBe(
            "INVALID_COLOR"
        );
        expect(errorCode(() => createAvatar("a", { colors: { hair: [] } }))).toBe("EMPTY_PALETTE");
        expect(errorCode(() => createAvatar("a", { background: "#12" }))).toBe("INVALID_COLOR");
        expect(errorCode(() => createAvatar("a", { size: 0 }))).toBe("INVALID_OPTION");
    });

    it("the error message lists the valid values", () => {
        expect(() => createAvatar("a", { parts: { hair: "nope" } })).toThrow(
            /bangs.*mohawk|mohawk.*bangs/
        );
    });
});
