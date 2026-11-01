/**
 * Standalone bundle entry: at publish time, `dist/standalone.js` is replaced by a build
 * that embeds React, react-dom, the UI and the CSS (no host-side dependency).
 */
export { mount } from "./browser/mount.js";
export type { NakasHandle } from "./browser/mount.js";
