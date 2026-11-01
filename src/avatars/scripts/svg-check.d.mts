/** Validates an SVG part and returns its `viewBox` and inner markup. Throws on invalid input. */
export function parsePartSvg(
    text: string,
    tokens: readonly string[]
): { viewBox: string; inner: string };
