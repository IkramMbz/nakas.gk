/**
 * A Nakas IS an agent. This type is the single model of a team member:
 * identity, appearance and link to its skill. Nothing else redefines it.
 */
export interface NakasAppearance {
    /** Name of a part in the `hair` layer (see `listParts()`). */
    readonly hair: string;
    readonly skin: string;
    readonly hairColor: string;
    readonly background: string;
    /** Name of a part in the `mouth` layer. Deterministic random if absent. */
    readonly mouth?: string;
}

export interface Nakas<Id extends string = string> {
    readonly id: Id;
    readonly name: string;
    readonly role: string;
    readonly appearance: NakasAppearance;
    /** Name of the SKILL.md shown in the panel (default: none). */
    readonly skill?: string;
    readonly badge?: number;
}
