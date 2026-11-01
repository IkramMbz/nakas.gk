import { describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildAvatar } from "../compose.js";
import { AvatarError } from "../errors.js";
import type { Registry } from "../types.js";
import { buildRegistry } from "../scripts/build-registry.mjs";
import { svg, tempAssets, writeSvg } from "./helpers.js";

const makeRegistry = (over: Partial<Registry>): Registry => ({
    canvas: { width: 10, height: 10 },
    layers: [{ name: "head" }, { name: "extra", probability: 50 }],
    palettes: { skin: ["#ffffff"] },
    parts: { head: { base: '<path d="M0 0" fill="{{skin}}"/>' }, extra: {} },
    ...over
});

describe("extensibility: adding an SVG without touching the engine", () => {
    it("a new file is discovered, listed and selectable", () => {
        const dir = tempAssets();
        writeSvg(dir, "hair", "my-new-hair", svg('<path d="M0 0h10v10z" fill="{{hair}}"/>'));
        const reg: Registry = buildRegistry(dir);

        expect(Object.keys(reg.parts.hair ?? {})).toContain("my-new-hair");
        const forced = buildAvatar(reg, "x", {
            parts: { hair: "my-new-hair" },
            colors: { hair: "#123456" }
        });
        expect(forced.svg).toContain('<path d="M0 0h10v10z" fill="#123456"/>');

        // and it is picked naturally by the seed, deterministically
        const seeds = Array.from({ length: 400 }, (_, i) => `s${i}`);
        const hit = seeds.find((s) => buildAvatar(reg, s).parts.hair === "my-new-hair");
        if (hit === undefined) throw new Error("the new part was never picked");
        expect(buildAvatar(reg, hit).svg).toBe(buildAvatar(reg, hit).svg);
    });

    it("adding an SVG only changes the avatars that pick it (existing avatars stay stable)", () => {
        const before: Registry = buildRegistry(tempAssets());
        const dir = tempAssets();
        writeSvg(dir, "eyes", "zzz", svg('<path d="M0 0h5v5z" fill="#000"/>'));
        const after: Registry = buildRegistry(dir);
        const changedEyes: (string | null | undefined)[] = [];
        for (let i = 0; i < 400; i++) {
            const a = buildAvatar(before, `k${i}`);
            const b = buildAvatar(after, `k${i}`);
            expect({ ...b.parts, eyes: 0 }).toEqual({ ...a.parts, eyes: 0 });
            expect(b.colors).toEqual(a.colors);
            if (b.parts.eyes !== a.parts.eyes) changedEyes.push(b.parts.eyes);
        }
        // only avatars that pick the new part change
        expect(new Set(changedEyes)).toEqual(new Set(["zzz"]));
        expect(changedEyes.length).toBeLessThan(80); // ~1/9 of 400, not the majority
    });

    it("a new layer declared in the manifest is picked up", () => {
        const dir = tempAssets();
        const mf = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
        mf.layers.push({ name: "hat", probability: 100 });
        writeFileSync(join(dir, "manifest.json"), JSON.stringify(mf));
        mkdirSync(join(dir, "hat"));
        writeSvg(dir, "hat", "cap", svg('<rect width="5" height="5" fill="#abcdef"/>'));
        const a = buildAvatar(buildRegistry(dir), "h");
        expect(a.parts.hat).toBe("cap");
        expect(a.svg).toContain("#abcdef");
    });
});

describe("generator: invalid SVGs and manifest", () => {
    const bad: [string, string, RegExp][] = [
        ["no svg root", "<div/>", /root element/],
        [
            "missing viewBox",
            `<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>`,
            /viewBox/
        ],
        ["empty", svg(""), /no elements/],
        ["script", svg("<script>alert(1)</script>"), /script/],
        ["event handler", svg('<path onclick="x()" d="M0 0"/>'), /event handler/],
        ["external href", svg('<use href="http://x/y.svg"/>'), /href/],
        ["id", svg('<path id="a" d="M0 0"/>'), /id attribute/],
        [
            "unknown token",
            svg('<path d="M0 0" fill="{{beard}}"/>'),
            /unknown color token \{\{beard\}\}/
        ],
        ["unclosed tag", svg('<g><path d="M0 0"/>'), /unclosed tag/],
        ["crossed tags", svg("<g><path d='M0 0'></g></path>"), /unexpected closing tag/]
    ];

    it.each(bad)("rejects: %s", (_label: string, content: string, re: RegExp) => {
        const dir = tempAssets();
        writeSvg(dir, "hair", "broken", content);
        expect(() => buildRegistry(dir)).toThrow(re);
        expect(() => buildRegistry(dir)).toThrow(/hair\/broken\.svg/); // the message names the file
    });

    it("rejects a non kebab-case file name and a non-.svg file", () => {
        let dir = tempAssets();
        writeSvg(dir, "hair", "MyHair", svg('<path d="M0 0"/>'));
        expect(() => buildRegistry(dir)).toThrow(/kebab-case/);
        dir = tempAssets();
        writeFileSync(join(dir, "hair", "notes.txt"), "x");
        expect(() => buildRegistry(dir)).toThrow(/only \.svg files/);
    });

    it("rejects a folder not declared in the manifest", () => {
        const dir = tempAssets();
        writeSvg(dir, "wings", "angel", svg('<path d="M0 0"/>'));
        expect(() => buildRegistry(dir)).toThrow(/wings.*not declared/);
    });

    it("rejects a declared layer without a folder", () => {
        const dir = tempAssets();
        rmSync(join(dir, "mouth"), { recursive: true });
        expect(() => buildRegistry(dir)).toThrow(/missing folder.*mouth/);
    });

    it("rejects an invalid manifest", () => {
        const dir = tempAssets();
        writeFileSync(join(dir, "manifest.json"), "{ nope");
        expect(() => buildRegistry(dir)).toThrow(/JSON/);
        writeFileSync(
            join(dir, "manifest.json"),
            JSON.stringify({ canvas: { width: 1, height: 1 }, layers: [], palettes: {} })
        );
        expect(() => buildRegistry(dir)).toThrow(/layers/);
    });
});

describe("empty layers and missing references at runtime", () => {
    it("an empty optional layer is ignored", () => {
        const a = buildAvatar(makeRegistry({}), "x");
        expect(a.parts).toEqual({ head: "base", extra: null });
    });

    it("an empty required layer throws EMPTY_LAYER", () => {
        const r = makeRegistry({ parts: { head: {}, extra: {} } });
        expect(() => buildAvatar(r, "x")).toThrow(AvatarError);
        expect(() => buildAvatar(r, "x")).toThrow(/required layer "head"/);
    });

    it("referencing a part of an empty layer throws EMPTY_LAYER", () => {
        expect(() => buildAvatar(makeRegistry({}), "x", { parts: { extra: "foo" } })).toThrow(
            expect.objectContaining({ code: "EMPTY_LAYER" })
        );
    });
});
