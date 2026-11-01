import type { Nakas } from "../../core/nakas.js";

export const bob = {
    id: "bob",
    name: "Bob",
    role: "Créateur de Nakas",
    skill: "nakas-creator",
    appearance: {
        hair: "curly-short-hair",
        skin: "#E49A82",
        hairColor: "#82381F",
        background: "#E2F5DD",
        mouth: "teeth-smile"
    }
} as const satisfies Nakas;
