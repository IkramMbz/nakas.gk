/**
 * Site config (identity, images, icons) shared with the host project:
 * `initSeoConfig()` at startup, then `getSeoConfig()` / `buildCanonicalUrl()`.
 * Independent of the audit; kept in the public API.
 */
export type IconLink = {
    rel: string;
    url: string;
    type?: string;
    sizes?: string;
    color?: string;
};
export type SeoConfig = {
    siteName: string;
    siteFullName: string;
    siteUrl: string;
    siteLang: string;
    siteLocale: string;
    titleSeparator: string;
    defaultOgImage: string;
    defaultOgImageWidth: number;
    defaultOgImageHeight: number;
    defaultOgImageAlt: string;
    defaultOgImageType: string;
    icons: {
        favicon: string;
        appleTouchIcon: string;
        shortcut: string;
        other?: IconLink[];
    };
    twitterHandle?: string;
    twitterCardType: "summary" | "summary_large_image" | "app" | "player";
    manifest?: string;
    googleSiteVerification?: string;
    bingSiteVerification?: string;
};
export declare const DEFAULT_SEO_CONFIG: SeoConfig;
export declare function initSeoConfig(config: Partial<SeoConfig>): void;
export declare function getSeoConfig(): SeoConfig;
export declare function buildCanonicalUrl(pageUrl: string, baseUrl?: string): string;
//# sourceMappingURL=site-config.d.ts.map