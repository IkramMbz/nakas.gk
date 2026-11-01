import type { Nakas } from "../../core/nakas.js";

export const amalia = {
    id: "amalia",
    name: "Amalia",
    role: "Agent Imports",
    skill: "import-doctor",
    appearance: {
        hair: "braids",
        skin: "#75462E",
        hairColor: "#171717",
        background: "#FCE8D5",
        mouth: "kawaii"
    }
} as const satisfies Nakas;
