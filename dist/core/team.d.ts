/** The team, in dock display order. Add a Nakas by adding it here. */
export declare const TEAM: readonly [{
    readonly id: "amalia";
    readonly name: "Amalia";
    readonly role: "Agent Imports";
    readonly skill: "import-doctor";
    readonly appearance: {
        readonly hair: "braids";
        readonly skin: "#75462E";
        readonly hairColor: "#171717";
        readonly background: "#FCE8D5";
        readonly mouth: "kawaii";
    };
}, {
    readonly id: "l";
    readonly name: "L";
    readonly role: "Agent SEO";
    readonly skill: "seo";
    readonly appearance: {
        readonly hair: "lawliet";
        readonly skin: "#EBDDC3";
        readonly hairColor: "#111";
        readonly background: "#E2F5DD";
        readonly mouth: "unimpressed";
    };
}, {
    readonly id: "bob";
    readonly name: "Bob";
    readonly role: "Créateur de Nakas";
    readonly skill: "nakas-creator";
    readonly appearance: {
        readonly hair: "curly-short-hair";
        readonly skin: "#E49A82";
        readonly hairColor: "#82381F";
        readonly background: "#E2F5DD";
        readonly mouth: "teeth-smile";
    };
}];
export type NakasId = (typeof TEAM)[number]["id"];
//# sourceMappingURL=team.d.ts.map