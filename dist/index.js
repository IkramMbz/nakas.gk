export { TEAM } from "./core/team.js";
export { isLocalHostname } from "./core/environment.js";
export { buildCanonicalUrl, DEFAULT_SEO_CONFIG, getSeoConfig, initSeoConfig } from "./agents/seo/site-config.js";
export { SEO_RULES } from "./agents/seo/rules.js";
/**
 * Mounts Nakas in the page. Call in the browser only (`onMounted`, `useEffect`,
 * `ngAfterViewInit`, page script…). Outside a browser or off a local host: does nothing.
 */
export async function mountNakas(options = {}) {
    if (typeof document === "undefined")
        return { unmount: () => undefined };
    const { mount } = await import("./standalone.js");
    return mount(options);
}
//# sourceMappingURL=index.js.map