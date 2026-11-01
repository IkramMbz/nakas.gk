import { describe, expect, it } from "vitest";

import { PANELS } from "../ui/panels.js";
import { getSkill } from "../ui/skills.js";
import { avatarSrc } from "./avatar.js";
import { isLocalHostname, resolveEnabled } from "./environment.js";
import { resolveConfig } from "./options.js";
import { TEAM } from "./team.js";

describe("environnement", () => {
    it.each([
        "localhost",
        "127.0.0.1",
        "[::1]",
        "app.localhost",
        "mac.local",
        "192.168.1.20",
        "10.0.0.5",
        "172.20.1.1"
    ])("%s est local", (h) => expect(isLocalHostname(h)).toBe(true));
    it.each(["example.com", "172.32.0.1", "8.8.8.8", ""])("%s n'est pas local", (h) =>
        expect(isLocalHostname(h)).toBe(false)
    );
    it("enabled explicite prime sur la détection", () => {
        expect(resolveEnabled(true, "example.com")).toBe(true);
        expect(resolveEnabled(false, "localhost")).toBe(false);
        expect(resolveEnabled(undefined, "example.com")).toBe(false);
    });
    it("endpoint normalisé", () => expect(resolveConfig({ endpoint: "/x/" }).endpoint).toBe("/x"));
});

describe("équipe", () => {
    it("ids uniques, un panneau déclaré et un avatar pour chaque Nakas", () => {
        expect(new Set(TEAM.map((n) => n.id)).size).toBe(TEAM.length);
        for (const [i, n] of TEAM.entries()) {
            expect(Object.hasOwn(PANELS, n.id)).toBe(true);
            expect(avatarSrc(n, i)).toMatch(/^data:image\/svg\+xml/);
        }
    });
    it("chaque skill référencé existe", () => {
        const missing = TEAM.flatMap((n) => ("skill" in n && !getSkill(n.skill) ? [n.skill] : []));
        expect(missing).toEqual([]);
    });
});
