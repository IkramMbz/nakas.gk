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
    // Site Identity.
    siteName: string;
    siteFullName: string;
    siteUrl: string;
    siteLang: string;
    siteLocale: string;
    titleSeparator: string;

    // Default Images.
    defaultOgImage: string;
    defaultOgImageWidth: number;
    defaultOgImageHeight: number;
    defaultOgImageAlt: string;
    defaultOgImageType: string;

    // Favicon & Icons.
    icons: {
        favicon: string;
        appleTouchIcon: string;
        shortcut: string;
        other?: IconLink[];
    };

    // Social Media.
    twitterHandle?: string;
    twitterCardType: "summary" | "summary_large_image" | "app" | "player";

    // Manifest.
    manifest?: string;

    // Verification.
    googleSiteVerification?: string;
    bingSiteVerification?: string;
};

// Default Configuration
export const DEFAULT_SEO_CONFIG: SeoConfig = {
    siteName: "MonSite",
    siteFullName: "Mon Site Complet",
    siteUrl: "https://monsite.com",
    siteLang: "fr",
    siteLocale: "fr_FR",
    titleSeparator: "|",

    defaultOgImage: "/images/og-default.jpg",
    defaultOgImageWidth: 1200,
    defaultOgImageHeight: 630,
    defaultOgImageAlt: "Image par défaut",
    defaultOgImageType: "image/jpeg",

    icons: {
        favicon: "/favicon.ico",
        appleTouchIcon: "/apple-180x180.png",
        shortcut: "/favicon-32x32.png",
        other: [
            {
                rel: "mask-icon",
                url: "/assets/media/img/manifest/favicon-32x32.png",
                color: "#000000"
            },
            {
                rel: "me",
                url: "https://twitter.com/yourbrand"
            },
            {
                rel: "me",
                url: "https://www.linkedin.com/company/yourbrand"
            },
            {
                rel: "me",
                url: "https://github.com/yourbrand"
            }
        ]
    },

    twitterCardType: "summary_large_image",

    // manifest: "/manifest.json",

    googleSiteVerification: "ton-code-google-search-console"
};

// Singleton instance
let seoConfigInstance: SeoConfig = DEFAULT_SEO_CONFIG;

// Call at app startup with your custom config.
export function initSeoConfig(config: Partial<SeoConfig>): void {
    seoConfigInstance = {
        ...DEFAULT_SEO_CONFIG,
        ...config
    };
}

export function getSeoConfig(): SeoConfig {
    return seoConfigInstance;
}

export function buildCanonicalUrl(pageUrl: string, baseUrl?: string): string {
    const base = baseUrl || seoConfigInstance.siteUrl;
    const cleanUrl = pageUrl.startsWith("/") ? pageUrl : `/${pageUrl}`;
    return `${base}${cleanUrl}`;
}
