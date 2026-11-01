import type { Nakas } from "../../core/nakas.js";

export const l = {
    id: "l",
    name: "L",
    role: "Agent SEO",
    skill: "seo",
    appearance: {
        hair: "lawliet",
        skin: "#EBDDC3",
        hairColor: "#111",
        background: "#E2F5DD",
        mouth: "unimpressed"
    }
} as const satisfies Nakas;
