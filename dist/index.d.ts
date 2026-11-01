/**
 * Vanilla entry point of `nakas-gk`: no framework required, no DOM access on import
 * (SSR-safe). UI code loads on demand, at the first `mountNakas()`.
 */
import type { NakasHandle } from "./browser/mount.js";
import type { NakasOptions } from "./core/options.js";
export type { NakasHandle } from "./browser/mount.js";
export type { NakasOptions } from "./core/options.js";
export type { Nakas, NakasAppearance } from "./core/nakas.js";
export type { NakasId } from "./core/team.js";
export { TEAM } from "./core/team.js";
export { isLocalHostname } from "./core/environment.js";
export { buildCanonicalUrl, DEFAULT_SEO_CONFIG, getSeoConfig, initSeoConfig, type SeoConfig } from "./agents/seo/site-config.js";
export { SEO_RULES } from "./agents/seo/rules.js";
/**
 * Mounts Nakas in the page. Call in the browser only (`onMounted`, `useEffect`,
 * `ngAfterViewInit`, page script…). Outside a browser or off a local host: does nothing.
 */
export declare function mountNakas(options?: NakasOptions): Promise<NakasHandle>;
//# sourceMappingURL=index.d.ts.map