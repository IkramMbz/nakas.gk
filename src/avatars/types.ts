/** A manifest layer. The order of `layers` defines stacking order, from back to front. */
export interface Layer {
    name: string;
    /** SVG `transform` attribute used to position the layer on the canvas. */
    transform?: string;
    /** Probability (0–100) that the layer is included. Defaults to 100. */
    probability?: number;
}

/** Registry generated from assets (see `scripts/build-registry.mjs`). */
export interface Registry {
    canvas: { width: number; height: number };
    layers: Layer[];
    /** Color palettes keyed by token, e.g. `{ hair: ["#220f00", ...] }`. */
    palettes: Record<string, string[]>;
    /** Internal SVG markup indexed by layer and part name. */
    parts: Record<string, Record<string, string>>;
}

export interface AvatarOptions {
    /**
     * Forces a part (`{ hair: "mohawk" }`) or removes a layer (`{ accessories: null }`).
     * Unspecified layers are selected deterministically from the seed.
     */
    parts?: Record<string, string | null>;
    /**
     * Forces a color or replaces the default palette for a color token.
     * Example: `{ skin: "#a47539", hair: ["#000000", "#ffffff"] }`.
     */
    colors?: Record<string, string | string[]>;
    /** Background color. Defaults to transparent. */
    background?: string | null;
    /** SVG width and height in pixels. Defaults to the canvas dimensions. */
    size?: number;
}

export interface Avatar {
    /** Complete SVG document. */
    svg: string;
    /** Selected part per layer, or `null` if the layer is absent. */
    parts: Record<string, string | null>;
    /** Selected color per token. */
    colors: Record<string, string>;
    toString(): string;
    /** Returns a `data:image/svg+xml` URI for use in HTML or CSS. */
    toDataUri(): string;
}
