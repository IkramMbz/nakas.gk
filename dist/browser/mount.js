import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from "react-dom/client";
import { resolveEnabled } from "../core/environment.js";
import { resolveConfig } from "../core/options.js";
import NakasApp from "../ui/nakas-app.js";
import { attachNakasShadow, HOST_ATTRIBUTE } from "../ui/shadow-host.js";
const instances = new WeakMap();
const NOOP = { unmount: () => undefined };
/**
 * Mounts Nakas in the current page, with any framework (or none).
 * One instance per document: a second call (HMR, double render) replaces the first.
 */
export function mount(options = {}) {
    if (typeof document === "undefined")
        return NOOP;
    if (!resolveEnabled(options.enabled, document.location.hostname))
        return NOOP;
    instances.get(document)?.unmount();
    // Hosts left by another copy of the module (HMR, double bundle): start from a clean page.
    document.querySelectorAll(`[${HOST_ATTRIBUTE}]`).forEach((el) => el.remove());
    const host = document.createElement("div");
    // Layout-less host: the fixed layer lives in the shadow DOM.
    host.style.cssText = "all:initial";
    document.body.append(host);
    const root = createRoot(attachNakasShadow(host));
    root.render(_jsx(NakasApp, { config: resolveConfig(options) }));
    let mounted = true;
    const handle = {
        unmount() {
            if (!mounted)
                return;
            mounted = false;
            root.unmount();
            host.remove();
            if (instances.get(document) === handle)
                instances.delete(document);
        }
    };
    instances.set(document, handle);
    return handle;
}
export { HOST_ATTRIBUTE };
//# sourceMappingURL=mount.js.map