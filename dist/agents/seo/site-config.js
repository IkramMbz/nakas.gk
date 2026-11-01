// Default Configuration
export const DEFAULT_SEO_CONFIG = {
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
let seoConfigInstance = DEFAULT_SEO_CONFIG;
// Call at app startup with your custom config.
export function initSeoConfig(config) {
    seoConfigInstance = {
        ...DEFAULT_SEO_CONFIG,
        ...config
    };
}
export function getSeoConfig() {
    return seoConfigInstance;
}
export function buildCanonicalUrl(pageUrl, baseUrl) {
    const base = baseUrl || seoConfigInstance.siteUrl;
    const cleanUrl = pageUrl.startsWith("/") ? pageUrl : `/${pageUrl}`;
    return `${base}${cleanUrl}`;
}
//# sourceMappingURL=site-config.js.map