import type { SeoAuditOptions } from "../types.js";
/**
 * View of the document for one audit pass: each DOM query runs at most once.
 * Checks never touch `document`/`location` directly (testable with any DOM).
 */
export declare function createSeoContext(doc: Document, options?: SeoAuditOptions): {
    doc: Document;
    win: (Window & typeof globalThis) | null;
    loc: Location | URL;
    hostname: string;
    isLocalhost: boolean;
    currentUrl: string;
    docElement: HTMLElement;
    readonly body: HTMLElement;
    title: () => string;
    metaDescription: () => HTMLMetaElement | null;
    metaRobots: () => HTMLMetaElement | null;
    metaViewport: () => HTMLMetaElement | null;
    canonical: () => HTMLLinkElement | null;
    ogTitle: () => HTMLMetaElement | null;
    ogDescription: () => HTMLMetaElement | null;
    ogImage: () => HTMLMetaElement | null;
    ogType: () => HTMLMetaElement | null;
    images: () => HTMLImageElement[];
    links: () => HTMLAnchorElement[];
    headings: () => Element[];
    scripts: () => HTMLScriptElement[];
    hreflangLinks: () => HTMLLinkElement[];
    schemaInfo: () => {
        count: number;
        types: Set<string>;
        valid: number;
        invalid: number;
    };
    mainContent: () => {
        element: HTMLElement | null;
        problem: string | null;
    };
    pageType: () => string;
    /** Selector for a meta tag with a value: `meta("name", "twitter:card")`. */
    meta: (attr: "name" | "property", key: string) => HTMLMetaElement | null;
};
export type SeoContext = ReturnType<typeof createSeoContext>;
//# sourceMappingURL=context.d.ts.map