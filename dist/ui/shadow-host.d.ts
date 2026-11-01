/** Attribute set on the host element; also detects an already-mounted instance. */
export declare const HOST_ATTRIBUTE = "data-nakas-host";
/**
 * Prepares a shadow DOM host: page CSS does not get in, Nakas CSS does not leak out
 * (and content is absent from `document.querySelectorAll`, so excluded from the SEO audit).
 */
export declare function attachNakasShadow(host: HTMLElement): HTMLElement;
//# sourceMappingURL=shadow-host.d.ts.map